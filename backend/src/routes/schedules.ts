import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role, ShiftType } from '@prisma/client';
import { scheduleSchema, scheduleBatchSchema } from '../validators';

const router = Router();

function getWeekRange(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

async function detectConflicts(userId: number, date: Date, shiftType: ShiftType, serviceLocationId: number, excludeId?: number) {
  const conflicts: string[] = [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const sameDaySchedules = await prisma.schedule.findMany({
    where: {
      userId,
      date: { gte: dayStart, lte: dayEnd },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const hasDuplicate = sameDaySchedules.some(s => s.shiftType === shiftType && s.serviceLocationId === serviceLocationId);
  if (hasDuplicate) {
    conflicts.push('同人同日同一服务点同一班次已存在排班记录');
  }

  if (shiftType === 'EVENING') {
    const prevDay = new Date(dayStart);
    prevDay.setDate(prevDay.getDate() - 1);
    const prevDayEnd = new Date(prevDay);
    prevDayEnd.setHours(23, 59, 59, 999);

    const prevEvening = await prisma.schedule.findFirst({
      where: {
        userId,
        date: { gte: prevDay, lte: prevDayEnd },
        shiftType: 'EVENING',
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (prevEvening) {
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayEnd = new Date(nextDay);
      nextDayEnd.setHours(23, 59, 59, 999);

      const nextEvening = await prisma.schedule.findFirst({
        where: {
          userId,
          date: { gte: dayStart, lte: dayEnd },
          shiftType: 'EVENING',
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });

      const nextDayEvening = await prisma.schedule.findFirst({
        where: {
          userId,
          date: { gte: nextDay, lte: nextDayEnd },
          shiftType: 'EVENING',
        },
      });

      if (prevEvening && nextEvening) {
        conflicts.push('连续夜班冲突：前一日和当日均为晚班');
      }
      if (nextEvening && nextDayEvening) {
        conflicts.push('连续夜班冲突：当日和次日均为晚班');
      }
    }

    const currentEvening = await prisma.schedule.findFirst({
      where: {
        userId,
        date: { gte: dayStart, lte: dayEnd },
        shiftType: 'EVENING',
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (currentEvening) {
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayEnd2 = new Date(nextDay);
      nextDayEnd2.setHours(23, 59, 59, 999);

      const nextDayEvening2 = await prisma.schedule.findFirst({
        where: {
          userId,
          date: { gte: nextDay, lte: nextDayEnd2 },
          shiftType: 'EVENING',
        },
      });

      if (nextDayEvening2) {
        conflicts.push('连续夜班冲突：当日和次日均为晚班');
      }
    }
  }

  return conflicts;
}

router.get('/week', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { date, serviceLocationId } = req.query;
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    const { monday, sunday } = getWeekRange(targetDate);

    const where: any = {
      date: { gte: monday, lte: sunday },
    };
    if (serviceLocationId) {
      where.serviceLocationId = Number(serviceLocationId);
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, role: true } },
        serviceLocation: true,
      },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
    });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: '获取排班数据失败' });
  }
});

router.get('/my-week', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? String(date) : new Date().toISOString().split('T')[0];
    const { monday, sunday } = getWeekRange(targetDate);

    const schedules = await prisma.schedule.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: monday, lte: sunday },
      },
      include: { serviceLocation: true },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
    });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: '获取个人排班失败' });
  }
});

router.get('/today', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: today, lte: todayEnd },
      },
      include: { serviceLocation: true },
      orderBy: { shiftType: 'asc' },
    });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: '获取今日排班失败' });
  }
});

router.get('/next-week', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const nextMonday = new Date();
    const day = nextMonday.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    nextMonday.setDate(nextMonday.getDate() + diff);
    nextMonday.setHours(0, 0, 0, 0);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedule.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: nextMonday, lte: nextSunday },
      },
      include: { serviceLocation: true },
      orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
    });

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: '获取下周排班失败' });
  }
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = scheduleSchema.parse(req.body);
    const targetUserId = req.user!.role === 'ADMIN' && payload.userId ? payload.userId : req.user!.id;

    const scheduleDate = new Date(payload.date);
    const conflicts = await detectConflicts(targetUserId, scheduleDate, payload.shiftType as ShiftType, payload.serviceLocationId);
    if (conflicts.length > 0) {
      res.status(409).json({ message: '排班冲突', conflicts });
      return;
    }

    const schedule = await prisma.schedule.create({
      data: {
        userId: targetUserId,
        date: scheduleDate,
        shiftType: payload.shiftType as ShiftType,
        serviceLocationId: payload.serviceLocationId,
        isLeader: payload.isLeader ?? false,
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
        serviceLocation: true,
      },
    });

    res.status(201).json(schedule);
  } catch (error) {
    res.status(400).json({ message: '创建排班失败', error: (error as any).message });
  }
});

router.post('/batch', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { schedules } = scheduleBatchSchema.parse(req.body);
    const results = [];
    const errors = [];

    for (let i = 0; i < schedules.length; i++) {
      const item = schedules[i];
      const targetUserId =
        req.user!.role === 'ADMIN' && item.userId ? item.userId : req.user!.id;
      const scheduleDate = new Date(item.date);
      const conflicts = await detectConflicts(targetUserId, scheduleDate, item.shiftType as ShiftType, item.serviceLocationId);
      if (conflicts.length > 0) {
        errors.push({ index: i, conflicts });
        continue;
      }

      const schedule = await prisma.schedule.upsert({
        where: {
          userId_date_shiftType_serviceLocationId: {
            userId: targetUserId,
            date: scheduleDate,
            shiftType: item.shiftType as ShiftType,
            serviceLocationId: item.serviceLocationId,
          },
        },
        update: { isLeader: item.isLeader ?? false },
        create: {
          userId: targetUserId,
          date: scheduleDate,
          shiftType: item.shiftType as ShiftType,
          serviceLocationId: item.serviceLocationId,
          isLeader: item.isLeader ?? false,
        },
        include: {
          user: { select: { id: true, username: true, role: true } },
          serviceLocation: true,
        },
      });
      results.push(schedule);
    }

    res.json({ created: results, errors });
  } catch (error) {
    res.status(400).json({ message: '批量排班失败', error: (error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const { shiftType, serviceLocationId, isLeader, date } = req.body;
    const scheduleDate = date ? new Date(date) : undefined;

    const existing = await prisma.schedule.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) {
      res.status(404).json({ message: '排班记录不存在' });
      return;
    }

    if (shiftType && scheduleDate) {
      const conflicts = await detectConflicts(
        existing.userId,
        scheduleDate,
        shiftType as ShiftType,
        serviceLocationId ?? existing.serviceLocationId,
        existing.id
      );
      if (conflicts.length > 0) {
        res.status(409).json({ message: '排班冲突', conflicts });
        return;
      }
    }

    const schedule = await prisma.schedule.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(shiftType ? { shiftType: shiftType as ShiftType } : {}),
        ...(serviceLocationId ? { serviceLocationId } : {}),
        ...(isLeader !== undefined ? { isLeader } : {}),
        ...(scheduleDate ? { date: scheduleDate } : {}),
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
        serviceLocation: true,
      },
    });

    res.json(schedule);
  } catch (error) {
    res.status(400).json({ message: '更新排班失败', error: (error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    await prisma.schedule.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: '排班已删除' });
  } catch (error) {
    res.status(400).json({ message: '删除排班失败' });
  }
});

router.post('/check-conflicts', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { userId, date, shiftType, serviceLocationId } = req.body;
    const conflicts = await detectConflicts(userId, new Date(date), shiftType as ShiftType, serviceLocationId);
    res.json({ conflicts });
  } catch (error) {
    res.status(400).json({ message: '冲突检测失败' });
  }
});

export default router;

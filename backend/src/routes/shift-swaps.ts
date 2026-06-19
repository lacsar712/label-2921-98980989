import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role, SwapStatus } from '@prisma/client';
import { shiftSwapSchema } from '../validators';

const router = Router();

router.get('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const where: any = {};

    if (req.user!.role === 'LIBRARIAN') {
      where.OR = [
        { requesterId: req.user!.id },
        { targetUserId: req.user!.id },
      ];
    }

    if (status) {
      where.status = String(status) as SwapStatus;
    }

    const swaps = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
        requesterSchedule: { include: { serviceLocation: true } },
        targetSchedule: { include: { serviceLocation: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: '获取换班请求列表失败' });
  }
});

router.get('/pending', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const swaps = await prisma.shiftSwapRequest.findMany({
      where: {
        targetUserId: req.user!.id,
        status: 'PENDING',
      },
      include: {
        requester: { select: { id: true, username: true } },
        requesterSchedule: { include: { serviceLocation: true } },
        targetSchedule: { include: { serviceLocation: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(swaps);
  } catch (error) {
    res.status(500).json({ message: '获取待确认换班请求失败' });
  }
});

router.get('/pending-count', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const count = await prisma.shiftSwapRequest.count({
      where: {
        targetUserId: req.user!.id,
        status: 'PENDING',
      },
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: '获取待确认换班数量失败' });
  }
});

router.post('/', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = shiftSwapSchema.parse(req.body);

    const requesterSchedule = await prisma.schedule.findUnique({
      where: { id: payload.requesterScheduleId },
    });
    const targetSchedule = await prisma.schedule.findUnique({
      where: { id: payload.targetScheduleId },
    });

    if (!requesterSchedule || !targetSchedule) {
      res.status(404).json({ message: '排班记录不存在' });
      return;
    }

    if (requesterSchedule.userId !== req.user!.id) {
      res.status(403).json({ message: '只能对自己排班发起换班请求' });
      return;
    }

    if (targetSchedule.userId !== payload.targetUserId) {
      res.status(400).json({ message: '目标排班与目标用户不匹配' });
      return;
    }

    const swap = await prisma.shiftSwapRequest.create({
      data: {
        requesterId: req.user!.id,
        targetUserId: payload.targetUserId,
        requesterScheduleId: payload.requesterScheduleId,
        targetScheduleId: payload.targetScheduleId,
        reason: payload.reason,
        status: 'PENDING',
      },
      include: {
        requester: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
        requesterSchedule: { include: { serviceLocation: true } },
        targetSchedule: { include: { serviceLocation: true } },
      },
    });

    res.status(201).json(swap);
  } catch (error) {
    res.status(400).json({ message: '创建换班请求失败', error: (error as any).message });
  }
});

router.put('/:id/approve', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!swap) {
      res.status(404).json({ message: '换班请求不存在' });
      return;
    }

    if (swap.targetUserId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ message: '只有目标用户或管理员可以审批换班请求' });
      return;
    }

    if (swap.status !== 'PENDING') {
      res.status(400).json({ message: '只能审批待处理的换班请求' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.schedule.update({
        where: { id: swap.requesterScheduleId },
        data: { userId: swap.targetUserId },
      });

      await tx.schedule.update({
        where: { id: swap.targetScheduleId },
        data: { userId: swap.requesterId },
      });

      await tx.shiftSwapRequest.update({
        where: { id: swap.id },
        data: {
          status: 'APPROVED',
          reviewedBy: req.user!.id,
          reviewedAt: new Date(),
        },
      });
    });

    const updated = await prisma.shiftSwapRequest.findUnique({
      where: { id: swap.id },
      include: {
        requester: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
        requesterSchedule: { include: { serviceLocation: true } },
        targetSchedule: { include: { serviceLocation: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: '审批换班请求失败', error: (error as any).message });
  }
});

router.put('/:id/reject', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!swap) {
      res.status(404).json({ message: '换班请求不存在' });
      return;
    }

    if (swap.targetUserId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ message: '只有目标用户或管理员可以拒绝换班请求' });
      return;
    }

    if (swap.status !== 'PENDING') {
      res.status(400).json({ message: '只能拒绝待处理的换班请求' });
      return;
    }

    const updated = await prisma.shiftSwapRequest.update({
      where: { id: swap.id },
      data: {
        status: 'REJECTED',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
      include: {
        requester: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
        requesterSchedule: { include: { serviceLocation: true } },
        targetSchedule: { include: { serviceLocation: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: '拒绝换班请求失败' });
  }
});

router.put('/:id/cancel', authenticate, authorize([Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const swap = await prisma.shiftSwapRequest.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!swap) {
      res.status(404).json({ message: '换班请求不存在' });
      return;
    }

    if (swap.requesterId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ message: '只有发起者或管理员可以取消换班请求' });
      return;
    }

    if (swap.status !== 'PENDING') {
      res.status(400).json({ message: '只能取消待处理的换班请求' });
      return;
    }

    const updated = await prisma.shiftSwapRequest.update({
      where: { id: swap.id },
      data: { status: 'CANCELLED' },
      include: {
        requester: { select: { id: true, username: true } },
        targetUser: { select: { id: true, username: true } },
        requesterSchedule: { include: { serviceLocation: true } },
        targetSchedule: { include: { serviceLocation: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: '取消换班请求失败' });
  }
});

export default router;

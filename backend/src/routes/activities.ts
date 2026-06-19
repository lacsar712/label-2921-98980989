import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import {
  createActivitySchema,
  updateActivitySchema,
  activityStatusUpdateSchema,
  activityFilterSchema,
  activityRegisterSchema,
  activityCancelSchema,
  activityCheckinSchema,
  activityCheckinBatchSchema,
  activityFeedbackSchema,
  activityRegistrationFilterSchema,
} from '../validators';

const router = Router();

const includeCreatedBy = {
  createdBy: { select: { id: true, username: true, role: true } },
};

const includeRegistrationsWithBorrower = {
  registrations: {
    include: {
      borrower: true,
    },
    orderBy: { registeredAt: 'asc' },
  },
};

const includeFeedbacks = {
  feedbacks: {
    include: {
      borrower: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  },
};

const computeRegistrationCounts = (activity: any) => {
  const registrations = activity.registrations || [];
  const registeredCount = registrations.filter((r: any) =>
    ['REGISTERED', 'CHECKED_IN', 'NO_SHOW'].includes(r.status)
  ).length;
  const waitlistCount = registrations.filter((r: any) => r.status === 'WAITLIST').length;
  const checkedInCount = registrations.filter((r: any) => r.status === 'CHECKED_IN').length;
  return { registeredCount, waitlistCount, checkedInCount };
};

const computeFeedbackStats = (activity: any) => {
  const feedbacks = activity.feedbacks || [];
  const feedbackCount = feedbacks.length;
  const averageRating =
    feedbackCount > 0
      ? feedbacks.reduce((sum: number, f: any) => sum + f.rating, 0) / feedbackCount
      : 0;
  return { feedbackCount, averageRating: Number(averageRating.toFixed(2)) };
};

// ============= 1. GET / - 获取活动列表 =============
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const query = activityFilterSchema.parse(req.query);
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { description: { contains: query.keyword } },
        { location: { contains: query.keyword } },
      ];
    }

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [activities, total, draftCount, registrationOpenCount, ongoingCount, endedCount] =
      await Promise.all([
        prisma.activity.findMany({
          where,
          include: includeCreatedBy,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.activity.count({ where }),
        prisma.activity.count({ where: { ...where, status: 'DRAFT' } }),
        prisma.activity.count({ where: { ...where, status: 'REGISTRATION_OPEN' } }),
        prisma.activity.count({ where: { ...where, status: 'ONGOING' } }),
        prisma.activity.count({ where: { ...where, status: 'ENDED' } }),
      ]);

    const stats = {
      total,
      drafts: draftCount,
      registrationOpen: registrationOpenCount,
      ongoing: ongoingCount,
      ended: endedCount,
    };

    res.json({
      data: activities,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      stats,
    });
  } catch (_error) {
    res.status(400).json({ message: '获取活动列表失败', error: (_error as any).message });
  }
});

// ============= 15. GET /stats/summary - 全局活动统计 =============
router.get('/stats/summary', authenticate, async (_req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalActivities,
      ongoingActivities,
      thisMonthActivities,
      registrations,
    ] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.count({ where: { status: 'ONGOING' } }),
      prisma.activity.count({
        where: {
          startTime: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.activityRegistration.findMany({
        where: {
          status: { in: ['REGISTERED', 'CHECKED_IN', 'NO_SHOW'] },
        },
        select: { status: true, activityId: true },
      }),
    ]);

    const uniqueActivityIds = [...new Set(registrations.map((r) => r.activityId))];
    let totalCheckedIn = 0;
    let totalRegistered = 0;
    for (const aid of uniqueActivityIds) {
      const regs = registrations.filter((r) => r.activityId === aid);
      totalRegistered += regs.length;
      totalCheckedIn += regs.filter((r) => r.status === 'CHECKED_IN').length;
    }
    const averageAttendanceRate =
      totalRegistered > 0
        ? Number(((totalCheckedIn / totalRegistered) * 100).toFixed(2))
        : 0;

    res.json({
      totalActivities,
      ongoingActivities,
      thisMonthActivities,
      totalRegistrations: registrations.length,
      averageAttendanceRate,
    });
  } catch (_error) {
    res.status(400).json({ message: '获取活动统计失败', error: (_error as any).message });
  }
});

// ============= 14. GET /borrower/:borrowerId - 获取某读者的所有活动报名记录 =============
router.get('/borrower/:borrowerId', authenticate, async (req, res) => {
  try {
    const borrowerId = Number(req.params.borrowerId);
    const registrations = await prisma.activityRegistration.findMany({
      where: { borrowerId },
      include: {
        activity: {
          include: includeCreatedBy,
        },
      },
      orderBy: { registeredAt: 'desc' },
    });
    res.json(registrations);
  } catch (_error) {
    res.status(400).json({ message: '获取读者活动记录失败', error: (_error as any).message });
  }
});

// ============= 2. GET /:id - 获取活动详情 =============
router.get('/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        ...includeCreatedBy,
        ...includeRegistrationsWithBorrower,
        ...includeFeedbacks,
      },
    });
    if (!activity) return res.status(404).json({ message: '活动不存在' });

    const { registeredCount, waitlistCount, checkedInCount } = computeRegistrationCounts(activity);
    const { feedbackCount, averageRating } = computeFeedbackStats(activity);

    res.json({
      ...activity,
      registeredCount,
      waitlistCount,
      checkedInCount,
      feedbackCount,
      averageRating,
    });
  } catch (_error) {
    res.status(400).json({ message: '获取活动详情失败', error: (_error as any).message });
  }
});

// ============= 9. GET /:id/registrations - 获取报名名单 =============
router.get('/:id/registrations', authenticate, async (req, res) => {
  try {
    const activityId = Number(req.params.id);
    const query = activityRegistrationFilterSchema.parse(req.query);

    const where: any = { activityId };
    if (query.status) where.status = query.status;

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [registrations, total] = await Promise.all([
      prisma.activityRegistration.findMany({
        where,
        include: { borrower: true },
        orderBy: [{ status: 'asc' }, { queuePosition: 'asc' }, { registeredAt: 'asc' }],
        skip,
        take,
      }),
      prisma.activityRegistration.count({ where }),
    ]);

    const registered = registrations.filter((r) => r.status !== 'WAITLIST');
    const waitlist = registrations.filter((r) => r.status === 'WAITLIST');

    res.json({
      registered,
      waitlist,
      data: registrations,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (_error) {
    res.status(400).json({ message: '获取报名名单失败', error: (_error as any).message });
  }
});

// ============= 12. GET /:id/stats - 活动统计 =============
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        registrations: true,
        feedbacks: true,
      },
    });
    if (!activity) return res.status(404).json({ message: '活动不存在' });

    const registrations = activity.registrations;
    const capacity = activity.capacity;
    const registeredCount = registrations.filter((r) =>
      ['REGISTERED', 'CHECKED_IN', 'NO_SHOW'].includes(r.status)
    ).length;
    const waitlistCount = registrations.filter((r) => r.status === 'WAITLIST').length;
    const cancelledCount = registrations.filter((r) => r.status === 'CANCELLED').length;
    const checkedInCount = registrations.filter((r) => r.status === 'CHECKED_IN').length;
    const attendanceRate =
      registeredCount > 0
        ? Number(((checkedInCount / registeredCount) * 100).toFixed(2))
        : 0;

    const feedbacks = activity.feedbacks;
    const feedbackCount = feedbacks.length;
    const averageRating =
      feedbackCount > 0
        ? Number(
            (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbackCount).toFixed(2)
          )
        : 0;

    res.json({
      capacity,
      registeredCount,
      waitlistCount,
      cancelledCount,
      checkedInCount,
      attendanceRate,
      feedbackCount,
      averageRating,
    });
  } catch (_error) {
    res.status(400).json({ message: '获取活动统计失败', error: (_error as any).message });
  }
});

// ============= 3. POST / - 创建活动 =============
router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = createActivitySchema.parse(req.body);

    const activity = await prisma.activity.create({
      data: {
        title: payload.title,
        description: payload.description,
        type: payload.type,
        startTime: new Date(payload.startTime),
        endTime: new Date(payload.endTime),
        location: payload.location,
        onlineUrl: payload.onlineUrl,
        capacity: payload.capacity,
        deadline: new Date(payload.deadline),
        coverUrl: payload.coverUrl,
        createdById: req.user!.id,
        status: 'DRAFT',
      },
      include: includeCreatedBy,
    });

    res.status(201).json(activity);
  } catch (_error) {
    res.status(400).json({ message: '创建活动失败', error: (_error as any).message });
  }
});

// ============= 4. PUT /:id - 更新活动 =============
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const payload = updateActivitySchema.parse(req.body);

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '活动不存在' });
    if (!['DRAFT', 'REGISTRATION_OPEN'].includes(existing.status)) {
      return res.status(400).json({ message: '只能修改草稿或报名中的活动' });
    }
    if (req.user!.role === Role.LIBRARIAN && existing.createdById !== req.user!.id) {
      return res.status(403).json({ message: '只能修改自己创建的活动' });
    }

    const updateData: any = {};
    if (payload.title) updateData.title = payload.title;
    if (payload.description) updateData.description = payload.description;
    if (payload.type) updateData.type = payload.type;
    if (payload.startTime) updateData.startTime = new Date(payload.startTime);
    if (payload.endTime) updateData.endTime = new Date(payload.endTime);
    if (payload.location) updateData.location = payload.location;
    if (payload.onlineUrl !== undefined) updateData.onlineUrl = payload.onlineUrl;
    if (payload.capacity !== undefined) updateData.capacity = payload.capacity;
    if (payload.deadline) updateData.deadline = new Date(payload.deadline);
    if (payload.coverUrl !== undefined) updateData.coverUrl = payload.coverUrl;

    const activity = await prisma.activity.update({
      where: { id },
      data: updateData,
      include: includeCreatedBy,
    });

    res.json(activity);
  } catch (_error) {
    res.status(400).json({ message: '更新活动失败', error: (_error as any).message });
  }
});

// ============= 5. DELETE /:id - 删除活动 =============
router.delete('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '活动不存在' });
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ message: '只能删除草稿状态的活动' });
    }
    if (req.user!.role === Role.LIBRARIAN && existing.createdById !== req.user!.id) {
      return res.status(403).json({ message: '只能删除自己创建的活动' });
    }

    await prisma.activity.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (_error) {
    res.status(400).json({ message: '删除活动失败', error: (_error as any).message });
  }
});

// ============= 6. PATCH /:id/status - 切换活动状态 =============
router.patch('/:id/status', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const payload = activityStatusUpdateSchema.parse(req.body);

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '活动不存在' });
    if (req.user!.role === Role.LIBRARIAN && existing.createdById !== req.user!.id) {
      return res.status(403).json({ message: '只能修改自己创建的活动' });
    }

    const now = new Date();
    let targetStatus = payload.status;

    if (targetStatus === 'REGISTRATION_OPEN' && existing.deadline <= now) {
      return res.status(400).json({ message: '报名截止时间已过，无法开启报名' });
    }

    if (targetStatus === 'ONGOING' && existing.startTime > now) {
      return res.status(400).json({ message: '活动开始时间未到，无法切换到进行中' });
    }

    if (targetStatus === 'ENDED' && existing.endTime > now) {
      return res.status(400).json({ message: '活动结束时间未到，无法切换到已结束' });
    }

    const validTransitions: Record<string, string[]> = {
      DRAFT: ['REGISTRATION_OPEN', 'CANCELLED'],
      REGISTRATION_OPEN: ['ONGOING', 'CANCELLED', 'DRAFT'],
      ONGOING: ['ENDED', 'CANCELLED'],
      ENDED: [],
      CANCELLED: ['DRAFT'],
    };

    if (!validTransitions[existing.status]?.includes(targetStatus)) {
      return res
        .status(400)
        .json({ message: `不允许从 ${existing.status} 切换到 ${targetStatus}` });
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: { status: targetStatus },
      include: includeCreatedBy,
    });

    res.json(activity);
  } catch (_error) {
    res.status(400).json({ message: '更新活动状态失败', error: (_error as any).message });
  }
});

// ============= 7. POST /:id/register - 读者报名 =============
router.post('/:id/register', authenticate, async (req: AuthRequest, res) => {
  try {
    const activityId = Number(req.params.id);
    const payload = activityRegisterSchema.parse(req.body);

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { registrations: true },
    });
    if (!activity) return res.status(404).json({ message: '活动不存在' });

    if (activity.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({ message: '活动未开放报名' });
    }

    const now = new Date();
    if (activity.deadline <= now) {
      return res.status(400).json({ message: '报名时间已截止' });
    }

    const borrower = await prisma.borrower.findUnique({
      where: { id: payload.borrowerId },
    });
    if (!borrower) return res.status(404).json({ message: '读者不存在' });

    const existing = await prisma.activityRegistration.findUnique({
      where: {
        activityId_borrowerId: {
          activityId,
          borrowerId: payload.borrowerId,
        },
      },
    });
    if (existing && existing.status !== 'CANCELLED') {
      return res.status(400).json({ message: '您已报名此活动' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentRegistered = await tx.activityRegistration.count({
        where: {
          activityId,
          status: { in: ['REGISTERED', 'CHECKED_IN', 'NO_SHOW'] },
        },
      });

      let status: any = 'REGISTERED';
      let queuePosition: number | null = null;

      if (currentRegistered >= activity.capacity) {
        status = 'WAITLIST';
        const waitlistCount = await tx.activityRegistration.count({
          where: { activityId, status: 'WAITLIST' },
        });
        queuePosition = waitlistCount + 1;
      }

      let registration;
      if (existing && existing.status === 'CANCELLED') {
        registration = await tx.activityRegistration.update({
          where: { id: existing.id },
          data: {
            status,
            queuePosition,
            registeredAt: new Date(),
            cancelledAt: null,
            cancelReason: null,
            checkInAt: null,
          },
          include: { borrower: true },
        });
      } else {
        registration = await tx.activityRegistration.create({
          data: {
            activityId,
            borrowerId: payload.borrowerId,
            status,
            queuePosition,
          },
          include: { borrower: true },
        });
      }

      return registration;
    });

    res.status(201).json(result);
  } catch (_error) {
    res.status(400).json({ message: '报名失败', error: (_error as any).message });
  }
});

// ============= 8. POST /:id/cancel - 取消报名 =============
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const activityId = Number(req.params.id);
    const payload = activityCancelSchema.parse(req.body);

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) return res.status(404).json({ message: '活动不存在' });

    const registration = await prisma.activityRegistration.findUnique({
      where: {
        activityId_borrowerId: {
          activityId,
          borrowerId: payload.borrowerId,
        },
      },
    });
    if (!registration) return res.status(404).json({ message: '未找到报名记录' });
    if (registration.status === 'CANCELLED') {
      return res.status(400).json({ message: '报名已取消' });
    }

    const wasWaitlist = registration.status === 'WAITLIST';

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.activityRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: payload.cancelReason,
          queuePosition: null,
        },
        include: { borrower: true },
      });

      if (!wasWaitlist) {
        const firstWaitlist = await tx.activityRegistration.findFirst({
          where: { activityId, status: 'WAITLIST' },
          orderBy: { queuePosition: 'asc' },
        });

        if (firstWaitlist) {
          await tx.activityRegistration.update({
            where: { id: firstWaitlist.id },
            data: {
              status: 'REGISTERED',
              queuePosition: null,
            },
          });

          const remainingWaitlist = await tx.activityRegistration.findMany({
            where: { activityId, status: 'WAITLIST' },
            orderBy: { queuePosition: 'asc' },
          });

          for (let i = 0; i < remainingWaitlist.length; i++) {
            await tx.activityRegistration.update({
              where: { id: remainingWaitlist[i].id },
              data: { queuePosition: i + 1 },
            });
          }
        }
      } else {
        const remainingWaitlist = await tx.activityRegistration.findMany({
          where: { activityId, status: 'WAITLIST' },
          orderBy: { queuePosition: 'asc' },
        });

        for (let i = 0; i < remainingWaitlist.length; i++) {
          await tx.activityRegistration.update({
            where: { id: remainingWaitlist[i].id },
            data: { queuePosition: i + 1 },
          });
        }
      }

      return updated;
    });

    res.json(result);
  } catch (_error) {
    res.status(400).json({ message: '取消报名失败', error: (_error as any).message });
  }
});

// ============= 10. PATCH /:id/checkin - 签到 =============
router.patch('/:id/checkin', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const activityId = Number(req.params.id);
    const payload = activityCheckinSchema.parse(req.body);

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) return res.status(404).json({ message: '活动不存在' });

    if (!['ONGOING', 'ENDED'].includes(activity.status)) {
      return res.status(400).json({ message: '活动未开始，无法签到' });
    }

    let updatedCount = 0;
    let updatedRegistrations: any[] = [];

    if ('registrationId' in payload) {
      const reg = await prisma.activityRegistration.findUnique({
        where: { id: payload.registrationId },
      });
      if (!reg || reg.activityId !== activityId) {
        return res.status(404).json({ message: '报名记录不存在' });
      }
      if (!['REGISTERED', 'NO_SHOW'].includes(reg.status)) {
        return res.status(400).json({ message: '当前状态无法签到' });
      }

      const updated = await prisma.activityRegistration.update({
        where: { id: payload.registrationId },
        data: { status: 'CHECKED_IN', checkInAt: new Date() },
        include: { borrower: true },
      });
      updatedCount = 1;
      updatedRegistrations = [updated];
    } else {
      const result = await prisma.$transaction(async (tx) => {
        const regs = await tx.activityRegistration.findMany({
          where: {
            activityId,
            borrowerId: { in: payload.borrowerIds },
            status: { in: ['REGISTERED', 'NO_SHOW'] },
          },
        });

        const updated = [];
        for (const reg of regs) {
          const u = await tx.activityRegistration.update({
            where: { id: reg.id },
            data: { status: 'CHECKED_IN', checkInAt: new Date() },
            include: { borrower: true },
          });
          updated.push(u);
        }
        return updated;
      });
      updatedCount = result.length;
      updatedRegistrations = result;
    }

    res.json({ message: `签到成功，共 ${updatedCount} 人`, data: updatedRegistrations });
  } catch (_error) {
    res.status(400).json({ message: '签到失败', error: (_error as any).message });
  }
});

// ============= 11. PATCH /:id/checkin-batch - 批量切换签到状态 =============
router.patch('/:id/checkin-batch', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const activityId = Number(req.params.id);
    const payload = activityCheckinBatchSchema.parse(req.body);

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) return res.status(404).json({ message: '活动不存在' });

    const result = await prisma.$transaction(async (tx) => {
      const regs = await tx.activityRegistration.findMany({
        where: { id: { in: payload.ids }, activityId },
      });

      if (regs.length !== payload.ids.length) {
        throw new Error('部分报名记录不存在或不属于此活动');
      }

      const updated = [];
      for (const id of payload.ids) {
        const data: any = { status: payload.status };
        if (payload.status === 'CHECKED_IN') {
          data.checkInAt = new Date();
        }
        const u = await tx.activityRegistration.update({
          where: { id },
          data,
          include: { borrower: true },
        });
        updated.push(u);
      }
      return updated;
    });

    res.json({ message: `更新成功，共 ${result.length} 条记录`, data: result });
  } catch (_error) {
    res.status(400).json({ message: '批量更新失败', error: (_error as any).message });
  }
});

// ============= 13. POST /:id/feedback - 提交反馈 =============
router.post('/:id/feedback', authenticate, async (req: AuthRequest, res) => {
  try {
    const activityId = Number(req.params.id);
    const payload = activityFeedbackSchema.parse(req.body);

    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) return res.status(404).json({ message: '活动不存在' });

    if (activity.status !== 'ENDED') {
      return res.status(400).json({ message: '活动未结束，暂不支持反馈' });
    }

    const borrower = await prisma.borrower.findUnique({
      where: { id: payload.borrowerId },
    });
    if (!borrower) return res.status(404).json({ message: '读者不存在' });

    const registration = await prisma.activityRegistration.findUnique({
      where: {
        activityId_borrowerId: {
          activityId,
          borrowerId: payload.borrowerId,
        },
      },
    });
    if (!registration || !['REGISTERED', 'CHECKED_IN', 'NO_SHOW'].includes(registration.status)) {
      return res.status(400).json({ message: '您未参加此活动，无法提交反馈' });
    }

    const existing = await prisma.activityFeedback.findUnique({
      where: {
        activityId_borrowerId: {
          activityId,
          borrowerId: payload.borrowerId,
        },
      },
    });
    if (existing) {
      return res.status(400).json({ message: '您已提交过反馈' });
    }

    const feedback = await prisma.activityFeedback.create({
      data: {
        activityId,
        borrowerId: payload.borrowerId,
        rating: payload.rating,
        comment: payload.comment,
      },
      include: { borrower: { select: { id: true, name: true } } },
    });

    res.status(201).json(feedback);
  } catch (_error) {
    res.status(400).json({ message: '提交反馈失败', error: (_error as any).message });
  }
});

export default router;

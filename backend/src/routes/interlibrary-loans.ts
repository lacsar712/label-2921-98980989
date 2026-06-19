import { Prisma } from '@prisma/client';
import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  interLibraryLoanSchema,
  interLibraryLoanUpdateSchema,
  interLibraryLoanStatusUpdateSchema,
  interLibraryLoanReminderSchema,
  interLibraryLoanExtensionSchema,
  interLibraryLoanExtensionReviewSchema,
  interLibraryLoanFilterSchema,
} from '../validators';

const router = Router();

const includeAll = {
  createdBy: { select: { id: true, username: true, role: true } },
  timelines: {
    include: { operator: { select: { id: true, username: true } } },
    orderBy: { timestamp: Prisma.SortOrder.asc },
  },
  extensions: {
    include: { approvedBy: { select: { id: true, username: true } } },
    orderBy: { createdAt: Prisma.SortOrder.desc },
  },
  reminders: {
    include: { operator: { select: { id: true, username: true } } },
    orderBy: { createdAt: Prisma.SortOrder.desc },
  },
} satisfies Prisma.InterLibraryLoanInclude;

const computeOverdue = (loan: any) => {
  if (!loan.dueDate || loan.status === 'RETURNED' || loan.status === 'REJECTED') {
    return { ...loan, isOverdue: false, overdueDays: 0 };
  }
  const now = new Date();
  const due = new Date(loan.dueDate);
  const diffDays = Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return { ...loan, isOverdue: diffDays > 0, overdueDays: diffDays > 0 ? diffDays : 0 };
};

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const query = interLibraryLoanFilterSchema.parse(req.query);
    const where: any = {};

    if (query.direction) where.direction = query.direction;
    if (query.status) where.status = query.status;
    if (query.partnerLibraryName) {
      where.partnerLibraryName = { contains: query.partnerLibraryName };
    }
    if (query.keyword) {
      where.OR = [
        { bookTitle: { contains: query.keyword } },
        { isbn: { contains: query.keyword } },
        { partnerLibraryName: { contains: query.keyword } },
        { contactPerson: { contains: query.keyword } },
        { trackingNumber: { contains: query.keyword } },
      ];
    }

    const loans = await prisma.interLibraryLoan.findMany({
      where,
      include: includeAll,
      orderBy: { createdAt: 'desc' },
    });

    let result = loans.map(computeOverdue);

    if (query.isOverdue === true) {
      result = result.filter((r: any) => r.isOverdue);
    } else if (query.isOverdue === false) {
      result = result.filter((r: any) => !r.isOverdue);
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message || '查询失败' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const loan = await prisma.interLibraryLoan.findUnique({
      where: { id: Number(req.params.id) },
      include: includeAll,
    });
    if (!loan) {
      return res.status(404).json({ message: '记录不存在' });
    }
    res.json(computeOverdue(loan));
  } catch (error: any) {
    res.status(400).json({ message: error.message || '查询失败' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = interLibraryLoanSchema.parse(req.body);
    const userId = req.user?.id;

    const loanData: any = {
      ...data,
      createdById: userId,
    };
    if (data.lendDate) loanData.lendDate = new Date(data.lendDate);
    if (data.dueDate) loanData.dueDate = new Date(data.dueDate);

    const loan = await prisma.interLibraryLoan.create({
      data: loanData,
      include: includeAll,
    });

    await prisma.interLibraryLoanTimeline.create({
      data: {
        loanId: loan.id,
        status: 'PENDING',
        action: '创建申请',
        operatorId: userId,
      },
    });

    const freshLoan = await prisma.interLibraryLoan.findUnique({
      where: { id: loan.id },
      include: includeAll,
    });

    res.status(201).json(computeOverdue(freshLoan));
  } catch (error: any) {
    res.status(400).json({ message: error.message || '创建失败' });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = interLibraryLoanUpdateSchema.parse(req.body);
    const userId = req.user?.id;

    const existing = await prisma.interLibraryLoan.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!existing) {
      return res.status(404).json({ message: '记录不存在' });
    }

    const updateData: any = { ...data };
    if (data.lendDate) updateData.lendDate = new Date(data.lendDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    const loan = await prisma.interLibraryLoan.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: includeAll,
    });

    await prisma.interLibraryLoanTimeline.create({
      data: {
        loanId: loan.id,
        action: '编辑信息',
        operatorId: userId,
      },
    });

    const freshLoan = await prisma.interLibraryLoan.findUnique({
      where: { id: loan.id },
      include: includeAll,
    });

    res.json(computeOverdue(freshLoan));
  } catch (error: any) {
    res.status(400).json({ message: error.message || '更新失败' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.interLibraryLoan.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!existing) {
      return res.status(404).json({ message: '记录不存在' });
    }

    await prisma.interLibraryLoan.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({ message: '删除成功' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || '删除失败' });
  }
});

router.post('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = interLibraryLoanStatusUpdateSchema.parse(req.body);
    const userId = req.user?.id;
    const loanId = Number(req.params.id);

    const existing = await prisma.interLibraryLoan.findUnique({
      where: { id: loanId },
    });
    if (!existing) {
      return res.status(404).json({ message: '记录不存在' });
    }

    const updateData: any = { status: data.status };
    if (data.note) updateData.remarks = data.note;
    if (data.rejectionReason) updateData.rejectionReason = data.rejectionReason;
    if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
    if (data.lendDate) updateData.lendDate = new Date(data.lendDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.actualReturnDate) updateData.actualReturnDate = new Date(data.actualReturnDate);

    const statusActionMap: Record<string, string> = {
      PENDING: '更新状态为申请中',
      SHIPPED: '确认已发货',
      IN_TRANSIT: '更新状态为运输中',
      IN_USE: '确认在馆使用',
      RETURNED: '确认已归还',
      REJECTED: '已拒收/驳回',
    };

    await prisma.$transaction([
      prisma.interLibraryLoan.update({
        where: { id: loanId },
        data: updateData,
      }),
      prisma.interLibraryLoanTimeline.create({
        data: {
          loanId,
          status: data.status,
          action: statusActionMap[data.status] || '状态更新',
          operatorId: userId,
          note: data.note,
        },
      }),
    ]);

    const loan = await prisma.interLibraryLoan.findUnique({
      where: { id: loanId },
      include: includeAll,
    });

    res.json(computeOverdue(loan));
  } catch (error: any) {
    res.status(400).json({ message: error.message || '状态更新失败' });
  }
});

router.post('/:id/reminders', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = interLibraryLoanReminderSchema.parse(req.body);
    const userId = req.user?.id;
    const loanId = Number(req.params.id);

    const existing = await prisma.interLibraryLoan.findUnique({
      where: { id: loanId },
    });
    if (!existing) {
      return res.status(404).json({ message: '记录不存在' });
    }

    const reminder = await prisma.interLibraryLoanReminder.create({
      data: {
        loanId,
        content: data.content,
        operatorId: userId,
      },
      include: { operator: { select: { id: true, username: true } } },
    });

    await prisma.interLibraryLoanTimeline.create({
      data: {
        loanId,
        action: '追加催还备注',
        operatorId: userId,
        note: data.content,
      },
    });

    res.status(201).json(reminder);
  } catch (error: any) {
    res.status(400).json({ message: error.message || '添加催还备注失败' });
  }
});

router.post('/:id/extensions', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = interLibraryLoanExtensionSchema.parse(req.body);
    const userId = req.user?.id;
    const loanId = Number(req.params.id);

    const existing = await prisma.interLibraryLoan.findUnique({
      where: { id: loanId },
    });
    if (!existing) {
      return res.status(404).json({ message: '记录不存在' });
    }
    if (!existing.dueDate) {
      return res.status(400).json({ message: '当前记录无应还日期，无法申请延期' });
    }

    const extension = await prisma.interLibraryLoanExtension.create({
      data: {
        loanId,
        originalDueDate: existing.dueDate,
        newDueDate: new Date(data.newDueDate),
        reason: data.reason,
      },
      include: { approvedBy: { select: { id: true, username: true } } },
    });

    await prisma.interLibraryLoanTimeline.create({
      data: {
        loanId,
        action: '提交延期申请',
        operatorId: userId,
        note: `延期至 ${data.newDueDate}，理由：${data.reason}`,
      },
    });

    res.status(201).json(extension);
  } catch (error: any) {
    res.status(400).json({ message: error.message || '提交延期申请失败' });
  }
});

router.post('/:id/extensions/:extId/review', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = interLibraryLoanExtensionReviewSchema.parse(req.body);
    const userId = req.user?.id;
    const loanId = Number(req.params.id);
    const extId = Number(req.params.extId);

    const loan = await prisma.interLibraryLoan.findUnique({
      where: { id: loanId },
    });
    if (!loan) {
      return res.status(404).json({ message: '记录不存在' });
    }

    const extension = await prisma.interLibraryLoanExtension.findUnique({
      where: { id: extId },
    });
    if (!extension || extension.loanId !== loanId) {
      return res.status(404).json({ message: '延期申请不存在' });
    }
    if (extension.status !== 'PENDING') {
      return res.status(400).json({ message: '该延期申请已处理' });
    }

    const updateData: any = {
      status: data.status,
      approvedById: userId,
      approvedAt: new Date(),
    };

    const timelineNote = data.status === 'APPROVED'
      ? `延期审批通过，新应还日期：${extension.newDueDate.toISOString().split('T')[0]}`
      : `延期审批驳回：${data.reviewNote || ''}`;

    await prisma.$transaction(async (tx: any) => {
      await tx.interLibraryLoanExtension.update({
        where: { id: extId },
        data: updateData,
      });

      if (data.status === 'APPROVED') {
        await tx.interLibraryLoan.update({
          where: { id: loanId },
          data: { dueDate: extension.newDueDate },
        });
      }

      await tx.interLibraryLoanTimeline.create({
        data: {
          loanId,
          action: data.status === 'APPROVED' ? '延期申请通过' : '延期申请驳回',
          operatorId: userId,
          note: timelineNote,
        },
      });
    });

    const freshLoan = await prisma.interLibraryLoan.findUnique({
      where: { id: loanId },
      include: includeAll,
    });

    res.json(computeOverdue(freshLoan));
  } catch (error: any) {
    res.status(400).json({ message: error.message || '审批失败' });
  }
});

export default router;

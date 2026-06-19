import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  createCompensationSchema,
  updateCompensationSchema,
  compensationStatusUpdateSchema,
  compensationFilterSchema,
} from '../validators';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const filter = compensationFilterSchema.safeParse(req.query);
    if (!filter.success) {
      return res.status(400).json({ message: 'Invalid filter', errors: filter.error.issues });
    }

    const { status, lossType, borrowerId, keyword } = filter.data;

    const where: any = {};
    if (status) where.status = status;
    if (lossType) where.lossType = lossType;
    if (borrowerId) where.borrowerId = borrowerId;
    if (keyword) {
      where.OR = [
        { book: { title: { contains: keyword, mode: 'insensitive' } } },
        { book: { isbn: { contains: keyword, mode: 'insensitive' } } },
        { borrower: { name: { contains: keyword, mode: 'insensitive' } } },
      ];
    }

    const compensations = await prisma.compensation.findMany({
      where,
      include: {
        book: { include: { category: true } },
        borrower: true,
        borrowRecord: true,
        handler: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(compensations);
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch compensations', error: (_error as any).message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const compensation = await prisma.compensation.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        book: { include: { category: true } },
        borrower: true,
        borrowRecord: true,
        handler: { select: { id: true, username: true } },
      },
    });

    if (!compensation) {
      return res.status(404).json({ message: 'Compensation not found' });
    }

    res.json(compensation);
  } catch (_error) {
    res.status(500).json({ message: 'Failed to fetch compensation', error: (_error as any).message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createCompensationSchema.parse(req.body);

    const borrowRecord = await prisma.borrowRecord.findUnique({
      where: { id: data.borrowRecordId },
      include: { book: true, borrower: true },
    });

    if (!borrowRecord) {
      return res.status(404).json({ message: 'Borrow record not found' });
    }

    if (borrowRecord.status === 'RETURNED') {
      return res.status(400).json({ message: 'Book has already been returned' });
    }

    const existing = await prisma.compensation.findUnique({
      where: { borrowRecordId: data.borrowRecordId },
    });
    if (existing) {
      return res.status(400).json({ message: 'Compensation already exists for this borrow record' });
    }

    const bookPrice = borrowRecord.book.price;
    const calculatedAmount = bookPrice * data.multiplier * (1 - data.depreciationRate);

    const compensation = await prisma.compensation.create({
      data: {
        borrowRecordId: data.borrowRecordId,
        bookId: borrowRecord.bookId,
        borrowerId: borrowRecord.borrowerId,
        lossType: data.lossType,
        bookPrice,
        multiplier: data.multiplier,
        depreciationRate: data.depreciationRate,
        calculatedAmount: Math.round(calculatedAmount * 100) / 100,
        adjustedAmount: data.adjustedAmount ?? null,
        note: data.note ?? null,
        handlerId: (req as AuthRequest).user?.id ?? null,
      },
      include: {
        book: { include: { category: true } },
        borrower: true,
        borrowRecord: true,
        handler: { select: { id: true, username: true } },
      },
    });

    await prisma.borrowRecord.update({
      where: { id: data.borrowRecordId },
      data: { status: data.lossType === 'LOST' ? 'LOST' : data.lossType === 'STOLEN' ? 'STOLEN' : 'DAMAGED' },
    });

    res.status(201).json(compensation);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to create compensation', error: (_error as any).message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = updateCompensationSchema.parse(req.body);

    const existing = await prisma.compensation.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Compensation not found' });
    }

    if (existing.status === 'SETTLED' || existing.status === 'WAIVED') {
      return res.status(400).json({ message: 'Cannot update a settled or waived compensation' });
    }

    const multiplier = data.multiplier ?? existing.multiplier;
    const depreciationRate = data.depreciationRate ?? existing.depreciationRate;
    const calculatedAmount = existing.bookPrice * multiplier * (1 - depreciationRate);

    const compensation = await prisma.compensation.update({
      where: { id: Number(req.params.id) },
      data: {
        multiplier,
        depreciationRate,
        calculatedAmount: Math.round(calculatedAmount * 100) / 100,
        adjustedAmount: data.adjustedAmount !== undefined ? data.adjustedAmount : existing.adjustedAmount,
        note: data.note !== undefined ? data.note : existing.note,
      },
      include: {
        book: { include: { category: true } },
        borrower: true,
        borrowRecord: true,
        handler: { select: { id: true, username: true } },
      },
    });

    res.json(compensation);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update compensation', error: (_error as any).message });
  }
});

router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = compensationStatusUpdateSchema.parse(req.body);

    const existing = await prisma.compensation.findUnique({
      where: { id: Number(req.params.id) },
      include: { book: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Compensation not found' });
    }

    const updateData: any = {
      status: data.status,
      handlerId: (req as AuthRequest).user?.id ?? existing.handlerId,
      note: data.note ?? existing.note,
    };

    if (data.paymentMethod) {
      updateData.paymentMethod = data.paymentMethod;
    }

    if (data.paidAmount !== undefined) {
      updateData.paidAmount = data.paidAmount;
    }

    if (data.status === 'SETTLED') {
      updateData.settledAt = new Date();
      updateData.paidAmount = existing.adjustedAmount ?? existing.calculatedAmount;

      await prisma.book.update({
        where: { id: existing.bookId },
        data: { stock: { decrement: 1 } },
      });
    }

    if (data.status === 'WAIVED') {
      updateData.settledAt = new Date();
    }

    if (data.status === 'INSTALLMENT' && data.paidAmount !== undefined) {
      const totalDue = existing.adjustedAmount ?? existing.calculatedAmount;
      if (data.paidAmount >= totalDue) {
        updateData.status = 'SETTLED';
        updateData.settledAt = new Date();
        updateData.paidAmount = totalDue;

        await prisma.book.update({
          where: { id: existing.bookId },
          data: { stock: { decrement: 1 } },
        });
      }
    }

    const compensation = await prisma.compensation.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      include: {
        book: { include: { category: true } },
        borrower: true,
        borrowRecord: true,
        handler: { select: { id: true, username: true } },
      },
    });

    res.json(compensation);
  } catch (_error) {
    res.status(400).json({ message: 'Failed to update compensation status', error: (_error as any).message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.compensation.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Compensation not found' });
    }

    if (existing.status === 'SETTLED') {
      return res.status(400).json({ message: 'Cannot delete a settled compensation' });
    }

    await prisma.compensation.delete({
      where: { id: Number(req.params.id) },
    });

    await prisma.borrowRecord.update({
      where: { id: existing.borrowRecordId },
      data: { status: 'BORROWED' },
    });

    res.json({ message: 'Compensation deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete compensation', error: (_error as any).message });
  }
});

export default router;

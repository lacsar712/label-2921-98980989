import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { borrowerId, status } = req.query;

    const where: any = {};
    if (borrowerId) where.borrowerId = Number(borrowerId);
    if (status) where.status = String(status);

    const reservations = await prisma.reservation.findMany({
      where,
      include: { book: { include: { category: true } }, borrower: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reservations' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { bookId, borrowerId } = req.body;

    if (!bookId || !borrowerId) {
      return res.status(400).json({ message: 'bookId and borrowerId are required' });
    }

    const book = await prisma.book.findUnique({ where: { id: Number(bookId) } });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const borrower = await prisma.borrower.findUnique({ where: { id: Number(borrowerId) } });
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    const activeBorrow = await prisma.borrowRecord.findFirst({
      where: {
        bookId: Number(bookId),
        borrowerId: Number(borrowerId),
        status: 'BORROWED',
      },
    });

    if (activeBorrow) {
      return res.status(400).json({ message: 'You already have this book borrowed' });
    }

    const existingReservation = await prisma.reservation.findFirst({
      where: {
        bookId: Number(bookId),
        borrowerId: Number(borrowerId),
        status: 'PENDING',
      },
    });

    if (existingReservation) {
      return res.status(400).json({ message: 'You already have a reservation for this book' });
    }

    if (book.stock > 0) {
      return res.status(400).json({ message: 'Book is available for borrowing, no need to reserve' });
    }

    const pendingCount = await prisma.reservation.count({
      where: {
        bookId: Number(bookId),
        status: 'PENDING',
      },
    });

    const reservation = await prisma.reservation.create({
      data: {
        bookId: Number(bookId),
        borrowerId: Number(borrowerId),
        queuePosition: pendingCount + 1,
      },
      include: { book: true, borrower: true },
    });

    res.status(201).json(reservation);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create reservation', error: (error as any).message });
  }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const reservationId = Number(req.params.id);

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    if (reservation.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending reservations can be cancelled' });
    }

    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
      }),
      prisma.reservation.updateMany({
        where: {
          bookId: reservation.bookId,
          status: 'PENDING',
          queuePosition: { gt: reservation.queuePosition },
        },
        data: { queuePosition: { decrement: 1 } },
      }),
    ]);

    res.json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to cancel reservation' });
  }
});

export default router;

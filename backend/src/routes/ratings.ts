import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/book/:bookId', async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const ratings = await prisma.bookRating.findMany({
      where: { bookId },
      include: { borrower: true },
      orderBy: { createdAt: 'desc' },
    });

    const avgRatingResult = await prisma.bookRating.aggregate({
      where: { bookId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      ratings,
      avgRating: avgRatingResult._avg.rating || 0,
      ratingCount: avgRatingResult._count.rating || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ratings' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { bookId, borrowerId, rating, comment } = req.body;

    if (!bookId || !borrowerId || !rating) {
      return res.status(400).json({ message: 'bookId, borrowerId and rating are required' });
    }

    const ratingNum = Number(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const book = await prisma.book.findUnique({ where: { id: Number(bookId) } });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const borrower = await prisma.borrower.findUnique({ where: { id: Number(borrowerId) } });
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    const hasBorrowed = await prisma.borrowRecord.findFirst({
      where: {
        bookId: Number(bookId),
        borrowerId: Number(borrowerId),
        status: 'RETURNED',
      },
    });

    if (!hasBorrowed) {
      return res.status(400).json({ message: 'You must return the book before rating' });
    }

    const existingRating = await prisma.bookRating.findUnique({
      where: {
        bookId_borrowerId: {
          bookId: Number(bookId),
          borrowerId: Number(borrowerId),
        },
      },
    });

    let result;
    if (existingRating) {
      result = await prisma.bookRating.update({
        where: { id: existingRating.id },
        data: {
          rating: ratingNum,
          comment: comment || null,
        },
        include: { borrower: true },
      });
    } else {
      result = await prisma.bookRating.create({
        data: {
          bookId: Number(bookId),
          borrowerId: Number(borrowerId),
          rating: ratingNum,
          comment: comment || null,
        },
        include: { borrower: true },
      });
    }

    res.status(existingRating ? 200 : 201).json(result);
  } catch (error) {
    res.status(400).json({ message: 'Failed to submit rating', error: (error as any).message });
  }
});

export default router;

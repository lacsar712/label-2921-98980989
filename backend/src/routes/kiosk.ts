import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

router.get('/isbn/:isbn', async (req, res) => {
  try {
    const { isbn } = req.params;
    const book = await prisma.book.findUnique({
      where: { isbn },
      include: { category: true },
    });

    if (!book) {
      return res.status(404).json({ message: '未找到该ISBN对应的图书' });
    }

    const borrowedCount = await prisma.borrowRecord.count({
      where: { bookId: book.id, status: 'BORROWED' },
    });

    const availableCount = book.stock - borrowedCount;

    const pendingReservations = await prisma.reservation.count({
      where: { bookId: book.id, status: 'PENDING' },
    });

    let earliestReturnDate: string | null = null;
    if (availableCount <= 0) {
      const activeBorrows = await prisma.borrowRecord.findMany({
        where: { bookId: book.id, status: 'BORROWED' },
        orderBy: { borrowDate: 'asc' },
        take: pendingReservations + 1,
      });

      if (activeBorrows.length > 0) {
        const BORROW_PERIOD_DAYS = 30;
        const estimatedDates = activeBorrows.map((record) => {
          const borrowedAt = new Date(record.borrowDate);
          const dueDate = new Date(borrowedAt.getTime() + BORROW_PERIOD_DAYS * 24 * 60 * 60 * 1000);
          return dueDate;
        });

        estimatedDates.sort((a, b) => a.getTime() - b.getTime());

        const idx = Math.min(pendingReservations, estimatedDates.length - 1);
        earliestReturnDate = estimatedDates[idx].toISOString();
      }
    }

    res.json({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      coverUrl: book.coverUrl,
      location: book.location,
      stock: book.stock,
      borrowedCount,
      availableCount,
      category: book.category,
      description: book.description,
      pendingReservations,
      earliestReturnDate,
    });
  } catch (error) {
    res.status(500).json({ message: '查询失败' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || String(q).trim().length === 0) {
      return res.json([]);
    }

    const keyword = String(q).trim();

    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { author: { contains: keyword } },
          { isbn: { contains: keyword } },
        ],
      },
      include: { category: true },
      take: 20,
    });

    const results = await Promise.all(
      books.map(async (book) => {
        const borrowedCount = await prisma.borrowRecord.count({
          where: { bookId: book.id, status: 'BORROWED' },
        });
        return {
          id: book.id,
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          coverUrl: book.coverUrl,
          location: book.location,
          stock: book.stock,
          borrowedCount,
          availableCount: book.stock - borrowedCount,
          category: book.category,
        };
      })
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: '搜索失败' });
  }
});

export default router;

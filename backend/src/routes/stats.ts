import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/dashboard', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const [bookCount, userCount, borrowCount, categoryCount] = await Promise.all([
    prisma.book.count(),
    prisma.borrower.count(),
    prisma.borrowRecord.count({ where: { status: 'BORROWED' } }),
    prisma.category.count(),
  ]);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const trends = await Promise.all(last7Days.map(async (date) => {
    const count = await prisma.borrowRecord.count({
      where: {
        borrowDate: {
          gte: new Date(date),
          lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });
    return { date, count };
  }));

  const categories = await prisma.category.findMany({
    include: { _count: { select: { books: true } } },
  });

  const lowStockBooks = await prisma.book.findMany({
    where: { stock: { lt: 5 } },
    take: 5,
    include: { category: true }
  });

  res.json({
    summary: { bookCount, userCount, borrowCount, categoryCount },
    trends,
    categories: categories.map(c => ({ name: c.name, count: c._count.books })),
    lowStockBooks
  });
});

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function calcChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

router.get('/report/monthly', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const monthParam = req.query.month as string;
  let year: number, month: number;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const { start, end } = getMonthRange(year, month);

  const prevMonthDate = new Date(year, month - 2, 1);
  const prevMonthYear = prevMonthDate.getFullYear();
  const prevMonthMonth = prevMonthDate.getMonth() + 1;
  const prevRange = getMonthRange(prevMonthYear, prevMonthMonth);

  const lastYearRange = getMonthRange(year - 1, month);

  const [
    borrowCount,
    returnCount,
    newBorrowers,
    newBooks,
    currentMonthBookStock,
  ] = await Promise.all([
    prisma.borrowRecord.count({
      where: { borrowDate: { gte: start, lt: end } },
    }),
    prisma.borrowRecord.count({
      where: { returnDate: { gte: start, lt: end }, status: 'RETURNED' },
    }),
    prisma.borrower.count({
      where: { createdAt: { gte: start, lt: end } },
    }),
    prisma.book.count({
      where: { createdAt: { gte: start, lt: end } },
    }),
    prisma.book.aggregate({ _sum: { stock: true } }),
  ]);

  const [
    prevBorrowCount,
    prevReturnCount,
    prevNewBorrowers,
    prevNewBooks,
    lastYearBorrowCount,
    lastYearReturnCount,
    lastYearNewBorrowers,
    lastYearNewBooks,
  ] = await Promise.all([
    prisma.borrowRecord.count({
      where: { borrowDate: { gte: prevRange.start, lt: prevRange.end } },
    }),
    prisma.borrowRecord.count({
      where: { returnDate: { gte: prevRange.start, lt: prevRange.end }, status: 'RETURNED' },
    }),
    prisma.borrower.count({
      where: { createdAt: { gte: prevRange.start, lt: prevRange.end } },
    }),
    prisma.book.count({
      where: { createdAt: { gte: prevRange.start, lt: prevRange.end } },
    }),
    prisma.borrowRecord.count({
      where: { borrowDate: { gte: lastYearRange.start, lt: lastYearRange.end } },
    }),
    prisma.borrowRecord.count({
      where: { returnDate: { gte: lastYearRange.start, lt: lastYearRange.end }, status: 'RETURNED' },
    }),
    prisma.borrower.count({
      where: { createdAt: { gte: lastYearRange.start, lt: lastYearRange.end } },
    }),
    prisma.book.count({
      where: { createdAt: { gte: lastYearRange.start, lt: lastYearRange.end } },
    }),
  ]);

  const totalStock = currentMonthBookStock._sum.stock || 0;
  const prevMonthBooksStock = await prisma.book.aggregate({
    _sum: { stock: true },
    where: { createdAt: { lt: start } },
  });
  const prevTotalStock = prevMonthBooksStock._sum.stock || 0;
  const stockChange = totalStock - prevTotalStock;

  const lastYearBookStock = await prisma.book.aggregate({
    _sum: { stock: true },
    where: { createdAt: { lt: lastYearRange.start } },
  });
  const lastYearTotalStock = lastYearBookStock._sum.stock || 0;
  const lastYearStockChange = (await prisma.book.aggregate({
    _sum: { stock: true },
    where: { createdAt: { gte: lastYearRange.start, lt: lastYearRange.end } },
  }))._sum.stock || 0;

  const coreMetrics = {
    borrowCount: {
      value: borrowCount,
      momChange: calcChange(borrowCount, prevBorrowCount),
      yoyChange: calcChange(borrowCount, lastYearBorrowCount),
    },
    returnCount: {
      value: returnCount,
      momChange: calcChange(returnCount, prevReturnCount),
      yoyChange: calcChange(returnCount, lastYearReturnCount),
    },
    newBorrowers: {
      value: newBorrowers,
      momChange: calcChange(newBorrowers, prevNewBorrowers),
      yoyChange: calcChange(newBorrowers, lastYearNewBorrowers),
    },
    newBooks: {
      value: newBooks,
      momChange: calcChange(newBooks, prevNewBooks),
      yoyChange: calcChange(newBooks, lastYearNewBooks),
    },
    stockChange: {
      value: stockChange,
      momChange: calcChange(stockChange, prevTotalStock > 0 ? totalStock - prevTotalStock : 0),
      yoyChange: calcChange(stockChange, lastYearStockChange),
    },
  };

  const activeBorrowers = await prisma.borrowRecord.findMany({
    where: { borrowDate: { gte: start, lt: end } },
    select: { borrowerId: true },
    distinct: ['borrowerId'],
  });

  const interpretation = generateInterpretation(coreMetrics, year, month);

  res.json({
    month: `${year}-${String(month).padStart(2, '0')}`,
    coreMetrics,
    activeBorrowerCount: activeBorrowers.length,
    totalStock,
    interpretation,
  });
});

function generateInterpretation(metrics: any, year: number, month: number): string {
  const parts: string[] = [];
  const m = metrics;

  if (m.borrowCount.momChange > 0) {
    parts.push(`借阅量环比增长${m.borrowCount.momChange}%，`);
  } else if (m.borrowCount.momChange < 0) {
    parts.push(`借阅量环比下降${Math.abs(m.borrowCount.momChange)}%，`);
  } else {
    parts.push(`借阅量环比持平，`);
  }

  if (m.newBooks.value > 0) {
    parts.push(`本月新增图书${m.newBooks.value}册，`);
  }

  if (m.returnCount.value < m.borrowCount.value) {
    parts.push(`归还量低于借阅量，在借量净增${m.borrowCount.value - m.returnCount.value}册。`);
  } else if (m.returnCount.value > m.borrowCount.value) {
    parts.push(`归还量高于借阅量，在借量净减${m.returnCount.value - m.borrowCount.value}册。`);
  } else {
    parts.push(`借还量基本持平。`);
  }

  return parts.join('');
}

router.get('/report/category-distribution', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const monthParam = req.query.month as string;
  let year: number, month: number;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const { start, end } = getMonthRange(year, month);

  const records = await prisma.borrowRecord.findMany({
    where: { borrowDate: { gte: start, lt: end } },
    include: { book: { include: { category: true } } },
  });

  const categoryMap = new Map<string, number>();
  for (const record of records) {
    const catName = record.book?.category?.name || '未分类';
    categoryMap.set(catName, (categoryMap.get(catName) || 0) + 1);
  }

  const distribution = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ month: `${year}-${String(month).padStart(2, '0')}`, distribution });
});

router.get('/report/top-books', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const monthParam = req.query.month as string;
  let year: number, month: number;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const { start, end } = getMonthRange(year, month);
  const limit = parseInt(req.query.limit as string) || 10;

  const records = await prisma.borrowRecord.findMany({
    where: { borrowDate: { gte: start, lt: end } },
    include: { book: { include: { category: true } } },
  });

  const bookMap = new Map<number, { id: number; title: string; author: string; category: string; count: number }>();
  for (const record of records) {
    const book = record.book;
    if (!book) continue;
    const existing = bookMap.get(book.id);
    if (existing) {
      existing.count++;
    } else {
      bookMap.set(book.id, {
        id: book.id,
        title: book.title,
        author: book.author,
        category: book.category?.name || '未分类',
        count: 1,
      });
    }
  }

  const topBooks = Array.from(bookMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  res.json({ month: `${year}-${String(month).padStart(2, '0')}`, topBooks });
});

router.get('/report/librarian-volume', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const monthParam = req.query.month as string;
  let year: number, month: number;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const { start, end } = getMonthRange(year, month);

  const schedules = await prisma.schedule.findMany({
    where: { date: { gte: start, lt: end } },
    include: { user: true, serviceLocation: true },
  });

  const librarianMap = new Map<number, { id: number; username: string; shiftCount: number; details: { date: string; shiftType: string; location: string }[] }>();
  for (const s of schedules) {
    const existing = librarianMap.get(s.userId);
    const detail = {
      date: s.date.toISOString().split('T')[0],
      shiftType: s.shiftType,
      location: s.serviceLocation?.name || '',
    };
    if (existing) {
      existing.shiftCount++;
      existing.details.push(detail);
    } else {
      librarianMap.set(s.userId, {
        id: s.userId,
        username: s.user?.username || '未知',
        shiftCount: 1,
        details: [detail],
      });
    }
  }

  const librarianVolume = Array.from(librarianMap.values())
    .sort((a, b) => b.shiftCount - a.shiftCount);

  res.json({ month: `${year}-${String(month).padStart(2, '0')}`, librarianVolume });
});

router.get('/report/overdue-trend', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const monthParam = req.query.month as string;
  let year: number, month: number;

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    [year, month] = monthParam.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const OVERDUE_DAYS = 30;

  const { start, end } = getMonthRange(year, month);

  const overdueRecords = await prisma.borrowRecord.findMany({
    where: {
      status: 'BORROWED',
      borrowDate: { lt: new Date(start.getTime() - OVERDUE_DAYS * 24 * 60 * 60 * 1000) },
    },
    include: { book: true, borrower: true },
  });

  const overdueByDay = new Map<string, { count: number; estimatedFine: number }>();

  const today = new Date();

  for (const record of overdueRecords) {
    const overdueDate = new Date(record.borrowDate.getTime() + OVERDUE_DAYS * 24 * 60 * 60 * 1000);
    if (overdueDate >= start && overdueDate < end) {
      const dayKey = overdueDate.toISOString().split('T')[0];
      const existing = overdueByDay.get(dayKey) || { count: 0, estimatedFine: 0 };
      existing.count++;
      const overdueDays = Math.floor((today.getTime() - overdueDate.getTime()) / (24 * 60 * 60 * 1000));
      existing.estimatedFine += overdueDays * 0.5;
      overdueByDay.set(dayKey, existing);
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const trend: { date: string; overdueCount: number; estimatedFine: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = overdueByDay.get(dateStr) || { count: 0, estimatedFine: 0 };
    trend.push({ date: dateStr, overdueCount: data.count, estimatedFine: Math.round(data.estimatedFine * 100) / 100 });
  }

  const totalOverdue = trend.reduce((sum, t) => sum + t.overdueCount, 0);
  const totalFine = trend.reduce((sum, t) => sum + t.estimatedFine, 0);

  res.json({
    month: `${year}-${String(month).padStart(2, '0')}`,
    trend,
    summary: { totalOverdue, totalFine: Math.round(totalFine * 100) / 100 },
  });
});

export default router;

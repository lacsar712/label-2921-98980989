import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

interface BorrowerProfile {
  categoryPreferences: Map<number, number>;
  borrowFrequency: number;
  recentlyReturnedBooks: Array<{ bookId: number; categoryId: number; returnDate: Date }>;
  borrowedBookIds: Set<number>;
  reservedBookIds: Set<number>;
}

const generateRecommendationReason = (
  book: any,
  profile: BorrowerProfile,
  categoryHotness: Map<number, number>,
  avgRating: number
): string => {
  const reasons: string[] = [];
  const categoryName = book.category?.name || '该分类';

  if (profile.categoryPreferences.get(book.categoryId) && profile.categoryPreferences.get(book.categoryId)! > 2) {
    reasons.push(`您偏好「${categoryName}」类图书`);
  }

  const recentlyReturnedSameCategory = profile.recentlyReturnedBooks.filter(
    (b) => b.categoryId === book.categoryId
  );
  if (recentlyReturnedSameCategory.length > 0) {
    reasons.push(`您最近归还过同类书籍`);
  }

  if (categoryHotness.get(book.categoryId) && categoryHotness.get(book.categoryId)! > 5) {
    reasons.push(`「${categoryName}」是当前热门分类`);
  }

  if (avgRating >= 4.5) {
    reasons.push(`评分高达 ${avgRating.toFixed(1)} 分`);
  } else if (avgRating >= 4.0) {
    reasons.push(`评分 ${avgRating.toFixed(1)} 分，口碑不错`);
  }

  if (reasons.length === 0) {
    reasons.push(`精选推荐`);
  }

  return reasons.join('，') + '，值得一读';
};

const getBorrowerProfile = async (borrowerId: number): Promise<BorrowerProfile> => {
  const profile: BorrowerProfile = {
    categoryPreferences: new Map(),
    borrowFrequency: 0,
    recentlyReturnedBooks: [],
    borrowedBookIds: new Set(),
    reservedBookIds: new Set(),
  };

  const borrowRecords = await prisma.borrowRecord.findMany({
    where: { borrowerId },
    include: { book: { include: { category: true } } },
    orderBy: { borrowDate: 'desc' },
  });

  profile.borrowFrequency = borrowRecords.length;

  borrowRecords.forEach((record) => {
    const categoryId = record.book.categoryId;
    profile.categoryPreferences.set(
      categoryId, (profile.categoryPreferences.get(categoryId) || 0) + 1
    );

    if (record.status === 'BORROWED') {
      profile.borrowedBookIds.add(record.bookId);
    }

    if (record.status === 'RETURNED' && record.returnDate) {
      const daysSinceReturn = new Date().getTime() - new Date(record.returnDate).getTime();
      if (daysSinceReturn < 30 * 24 * 60 * 60 * 1000) {
        profile.recentlyReturnedBooks.push({
          bookId: record.bookId,
          categoryId: record.book.categoryId,
          returnDate: record.returnDate,
        });
      }
    }
  });

  const reservations = await prisma.reservation.findMany({
    where: {
      borrowerId,
      status: 'PENDING',
    },
  });

  reservations.forEach((r) => profile.reservedBookIds.add(r.bookId));

  return profile;
};

const getCategoryHotness = async (): Promise<Map<number, number>> => {
  const hotness = new Map<number, number>();

  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const popularBooks = await prisma.borrowRecord.groupBy({
    by: ['bookId'],
    where: {
      borrowDate: { gte: last30Days },
    },
    _count: { bookId: true },
  });

  const books = await prisma.book.findMany({
    where: { id: { in: popularBooks.map((b) => b.bookId) } },
    select: { id: true, categoryId: true },
  });

  const bookCategoryMap = new Map(books.map((b) => [b.id, b.categoryId]));

  popularBooks.forEach((item) => {
    const categoryId = bookCategoryMap.get(item.bookId);
    if (categoryId !== undefined) {
      hotness.set(categoryId, (hotness.get(categoryId) || 0) + item._count.bookId);
    }
  });

  return hotness;
};

const getBooksWithStats = async (bookIds: number[]) => {
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds } },
    include: {
      category: true,
      _count: {
        select: {
          borrows: { where: { status: 'BORROWED' } },
          ratings: true,
        },
      },
    },
  });

  const ratings = await prisma.bookRating.groupBy({
    by: ['bookId'],
    where: { bookId: { in: bookIds } },
    _avg: { rating: true },
  });

  const ratingMap = new Map(ratings.map((r) => [r.bookId, r._avg.rating || 0]));

  return books.map((book) => ({
    ...book,
    borrowedCount: book._count.borrows,
    ratingCount: book._count.ratings,
    avgRating: ratingMap.get(book.id) || 0,
  }));
};

const calculateScore = (
  book: any,
  profile: BorrowerProfile,
  categoryHotness: Map<number, number>,
  avgRating: number
): number => {
  let score = 0;

  const categoryPref = profile.categoryPreferences.get(book.categoryId) || 0;
  score += categoryPref * 3;

  const hasRecentReturn = profile.recentlyReturnedBooks.some(
    (b) => b.categoryId === book.categoryId
  );
  if (hasRecentReturn) score += 5;

  const categoryBorrowCount = categoryHotness.get(book.categoryId) || 0;
  score += Math.min(categoryBorrowCount * 0.5, 10);

  score += avgRating * 2;

  score += Math.random() * 2;

  return score;
};

router.get('/:borrowerId', authenticate, async (req: AuthRequest, res) => {
  try {
    const borrowerId = Number(req.params.borrowerId);
    const { excludeBorrowed = 'true', excludeReserved = 'true', limit = '6', offset = '0' } = req.query;

    const borrower = await prisma.borrower.findUnique({ where: { id: borrowerId } });
    if (!borrower) {
      return res.status(404).json({ message: 'Borrower not found' });
    }

    const profile = await getBorrowerProfile(borrowerId);
    const categoryHotness = await getCategoryHotness();

    let allBooks = await prisma.book.findMany({
      include: { category: true },
    });

    if (excludeBorrowed === 'true') {
      allBooks = allBooks.filter((book) => !profile.borrowedBookIds.has(book.id));
    }

    if (excludeReserved === 'true') {
      allBooks = allBooks.filter((book) => !profile.reservedBookIds.has(book.id));
    }

    const bookIds = allBooks.map((b) => b.id);
    const booksWithStats = await getBooksWithStats(bookIds);

    const ratedBooks = booksWithStats.map((book) => ({
      book,
      score: calculateScore(book, profile, categoryHotness, book.avgRating || 0),
    }));

    ratedBooks.sort((a, b) => b.score - a.score);

    const limitNum = Number(limit);
    const offsetNum = Number(offset);
    const paginatedBooks = ratedBooks.slice(offsetNum, offsetNum + limitNum);

    const recommendations = paginatedBooks.map(({ book }) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      stock: book.stock,
      price: book.price,
      description: book.description,
      category: book.category,
      borrowedCount: book.borrowedCount,
      avgRating: book.avgRating,
      ratingCount: book.ratingCount,
      reason: generateRecommendationReason(book, profile, categoryHotness, book.avgRating || 0),
    }));

    res.json({
      borrower,
      recommendations,
      total: ratedBooks.length,
      hasMore: offsetNum + limitNum < ratedBooks.length,
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ message: 'Failed to generate recommendations' });
  }
});

export default router;

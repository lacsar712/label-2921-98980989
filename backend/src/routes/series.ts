import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import {
  seriesSchema,
  seriesUpdateSchema,
  seriesVolumeSchema,
  seriesVolumeUpdateSchema,
  purchaseRequestSchema,
  purchaseRequestReviewSchema,
} from '../validators';

const router = Router();

router.get('/', async (req, res) => {
  const { search, seriesType } = req.query;
  const series = await prisma.bookSeries.findMany({
    where: {
      ...(search ? { name: { contains: String(search) } } : {}),
      ...(seriesType ? { seriesType: String(seriesType) as any } : {}),
    },
    include: {
      _count: {
        select: {
          volumes: {
            where: {
              bookId: {
                not: null,
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const seriesWithStats = await Promise.all(
    series.map(async (s) => {
      const volumes = await prisma.seriesVolume.findMany({
        where: { seriesId: s.id },
        include: { book: true },
      });
      const totalBorrowed = volumes.reduce((count, v) => {
        if (!v.book) return count;
        return count + v.book.stock;
      }, 0);
      const totalInStock = volumes.filter((v) => v.book && v.book.stock > 0).length;
      const borrowedCount = volumes.reduce((count, v) => {
        if (!v.book) return count;
        return count + (v.book.stock > 0 ? 0 : 0);
      }, 0);

      const borrowRecords = await prisma.borrowRecord.findMany({
        where: {
          bookId: {
            in: volumes.filter((v) => v.bookId).map((v) => v.bookId!),
          },
          status: 'BORROWED',
        },
      });
      const borrowRatio = totalInStock > 0 ? borrowRecords.length / totalInStock : 0;

      return {
        ...s,
        collectedCount: volumes.filter((v) => v.bookId !== null).length,
        missingCount: volumes.filter((v) => v.isMissing).length,
        borrowRatio: borrowRatio * 100,
        completion: s.expectedTotalVolumes > 0
          ? (volumes.filter((v) => v.bookId !== null).length / s.expectedTotalVolumes) * 100
          : 0,
      };
    })
  );

  res.json(seriesWithStats);
});

router.get('/:id', async (req, res) => {
  const series = await prisma.bookSeries.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      volumes: {
        orderBy: { volumeNumber: 'asc' },
        include: {
          book: {
            include: {
              category: true,
            },
          },
          purchaseRequests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!series) return res.status(404).json({ message: 'Series not found' });

  const collectedVolumes = series.volumes.filter((v) => v.bookId !== null);
  const missingVolumes = series.volumes.filter((v) => v.isMissing);
  const pendingPurchase = series.volumes.filter(
    (v) => v.purchaseStatus === 'PENDING' || v.purchaseStatus === 'APPROVED'
  );

  const borrowRecords = await prisma.borrowRecord.findMany({
    where: {
      bookId: {
        in: collectedVolumes.filter((v) => v.bookId).map((v) => v.bookId!),
      },
      status: 'BORROWED',
    },
    include: { book: true },
  });

  const totalInStock = collectedVolumes.filter((v) => v.book && v.book.stock > 0).length;
  const borrowRatio = totalInStock > 0 ? (borrowRecords.length / totalInStock) * 100 : 0;

  res.json({
    ...series,
    stats: {
      collectedCount: collectedVolumes.length,
      missingCount: missingVolumes.length,
      pendingPurchaseCount: pendingPurchase.length,
      completion:
        series.expectedTotalVolumes > 0
          ? (collectedVolumes.length / series.expectedTotalVolumes) * 100
          : 0,
      borrowRatio,
      borrowedCount: borrowRecords.length,
    },
    missingVolumes,
    pendingPurchase,
  });
});

router.post('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = seriesSchema.parse({
      ...req.body,
      expectedTotalVolumes: Number(req.body.expectedTotalVolumes),
    });
    const series = await prisma.bookSeries.create({
      data: payload,
    });
    res.status(201).json(series);
  } catch (_error) {
    res.status(400).json({
      message: 'Failed to create series',
      error: (_error as any).message,
    });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = seriesUpdateSchema.parse({
      ...req.body,
      expectedTotalVolumes: req.body.expectedTotalVolumes !== undefined
        ? Number(req.body.expectedTotalVolumes)
        : undefined,
    });
    const series = await prisma.bookSeries.update({
      where: { id: Number(req.params.id) },
      data: payload,
    });
    res.json(series);
  } catch (_error) {
    res.status(400).json({
      message: 'Failed to update series',
      error: (_error as any).message,
    });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    await prisma.bookSeries.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ message: 'Series deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete series' });
  }
});

router.post('/:id/volumes', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = seriesVolumeSchema.parse({
      ...req.body,
      seriesId: Number(req.params.id),
      bookId: req.body.bookId ? Number(req.body.bookId) : undefined,
      volumeNumber: Number(req.body.volumeNumber),
    });
    const volume = await prisma.seriesVolume.create({
      data: payload,
    });
    res.status(201).json(volume);
  } catch (_error) {
    res.status(400).json({
      message: 'Failed to add volume',
      error: (_error as any).message,
    });
  }
});

router.put('/:id/volumes/:volumeId', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = seriesVolumeUpdateSchema.parse({
      ...req.body,
      bookId: req.body.bookId !== undefined ? Number(req.body.bookId) : undefined,
      volumeNumber: req.body.volumeNumber !== undefined ? Number(req.body.volumeNumber) : undefined,
    });
    const volume = await prisma.seriesVolume.update({
      where: { id: Number(req.params.volumeId) },
      data: payload,
    });
    res.json(volume);
  } catch (_error) {
    res.status(400).json({
      message: 'Failed to update volume',
      error: (_error as any).message,
    });
  }
});

router.delete('/:id/volumes/:volumeId', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    await prisma.seriesVolume.delete({
      where: { id: Number(req.params.volumeId) },
    });
    res.json({ message: 'Volume deleted' });
  } catch (_error) {
    res.status(400).json({ message: 'Failed to delete volume' });
  }
});

router.post('/:id/volumes/:volumeId/purchase', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const payload = purchaseRequestSchema.parse({
      ...req.body,
      seriesId: Number(req.params.id),
      volumeId: Number(req.params.volumeId),
      estimatedPrice: req.body.estimatedPrice ? Number(req.body.estimatedPrice) : undefined,
    });

    const userId = (req as any).user.id;

    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        ...payload,
        requestedById: userId,
      },
    });

    await prisma.seriesVolume.update({
      where: { id: Number(req.params.volumeId) },
      data: { purchaseStatus: 'PENDING' },
    });

    res.status(201).json(purchaseRequest);
  } catch (_error) {
    res.status(400).json({
      message: 'Failed to create purchase request',
      error: (_error as any).message,
    });
  }
});

router.get('/purchase-requests', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  const { status } = req.query;
  const requests = await prisma.purchaseRequest.findMany({
    where: {
      ...(status ? { status: String(status) as any } : {}),
    },
    include: {
      series: true,
      volume: {
        include: { book: true },
      },
      requestedBy: {
        select: { id: true, username: true },
      },
      reviewedBy: {
        select: { id: true, username: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

router.put('/purchase-requests/:id/review', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const payload = purchaseRequestReviewSchema.parse(req.body);
    const userId = (req as any).user.id;

    const updateData: any = {
      status: payload.status,
      reviewedById: userId,
      reviewedAt: new Date(),
    };

    if (payload.status === 'PURCHASED') {
      updateData.purchasedAt = new Date();
    }

    const purchaseRequest = await prisma.purchaseRequest.update({
      where: { id: Number(req.params.id) },
      data: updateData,
    });

    await prisma.seriesVolume.update({
      where: { id: purchaseRequest.volumeId },
      data: { purchaseStatus: payload.status },
    });

    res.json(purchaseRequest);
  } catch (_error) {
    res.status(400).json({
      message: 'Failed to review purchase request',
      error: (_error as any).message,
    });
  }
});

export default router;

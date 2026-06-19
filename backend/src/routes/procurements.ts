import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '@prisma/client';
import {
  createProcurementRequestSchema,
  updateProcurementRequestSchema,
  reviewProcurementRequestSchema,
  createProcurementOrderSchema,
  updateProcurementOrderSchema,
  createArrivalRecordSchema,
  createReturnRecordSchema,
  stockInSchema,
  procurementRequestFilterSchema,
  procurementOrderFilterSchema,
} from '../validators';

const router = Router();

const generateNo = (prefix: string) => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${yyyy}${mm}${dd}${rand}`;
};

const includeRequestDetail = {
  requestedBy: { select: { id: true, username: true } },
  reviewedBy: { select: { id: true, username: true } },
  items: {
    include: {
      category: true,
    },
  },
  orders: {
    include: {
      createdBy: { select: { id: true, username: true } },
      items: {
        include: {
          category: true,
          arrivalItems: true,
          returnItems: true,
        },
      },
      arrivalRecords: {
        include: {
          operator: { select: { id: true, username: true } },
          items: true,
        },
      },
      returnRecords: {
        include: {
          operator: { select: { id: true, username: true } },
          items: true,
        },
      },
    },
  },
};

const includeOrderDetail = {
  request: {
    include: {
      requestedBy: { select: { id: true, username: true } },
      reviewedBy: { select: { id: true, username: true } },
    },
  },
  createdBy: { select: { id: true, username: true } },
  items: {
    include: {
      category: true,
      arrivalItems: true,
      returnItems: true,
    },
  },
  arrivalRecords: {
    include: {
      operator: { select: { id: true, username: true } },
      items: {
        include: {
          stockInBy: { select: { id: true, username: true } },
        },
      },
    },
  },
  returnRecords: {
    include: {
      operator: { select: { id: true, username: true } },
      items: true,
    },
  },
};

// ============= 采购申请 =============

router.get('/requests', authenticate, async (req: AuthRequest, res) => {
  try {
    const query = procurementRequestFilterSchema.parse(req.query);
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.requestedById) where.requestedById = query.requestedById;
    else if (!req.user || req.user.role === Role.LIBRARIAN) {
      where.requestedById = req.user?.id;
    }

    if (query.keyword) {
      where.OR = [
        { requestNo: { contains: query.keyword } },
        { subject: { contains: query.keyword } },
        { reason: { contains: query.keyword } },
        { items: { some: { OR: [
          { title: { contains: query.keyword } },
          { isbn: { contains: query.keyword } },
          { author: { contains: query.keyword } },
        ] } },
      ];
    }
    if (query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    if (query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };

    const requests = await prisma.procurementRequest.findMany({
      where,
      include: includeRequestDetail,
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (_error) {
    res.status(400).json({ message: '获取采购申请列表失败', error: (_error as any).message });
  }
});

router.get('/requests/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const request = await prisma.procurementRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: includeRequestDetail,
    });
    if (!request) return res.status(404).json({ message: '采购申请不存在' });
    res.json(request);
  } catch (_error) {
    res.status(400).json({ message: '获取采购申请失败', error: (_error as any).message });
  }
});

router.post('/requests', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = createProcurementRequestSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.procurementRequest.create({
        data: {
          requestNo: generateNo('PR'),
          subject: payload.subject,
          reason: payload.reason,
          fundSubject: payload.fundSubject,
          requestedById: req.user!.id,
          items: {
            create: payload.items.map((item) => ({
              title: item.title,
              author: item.author,
              isbn: item.isbn,
              publisher: item.publisher,
              requestedQty: item.requestedQty,
              estimatedPrice: item.estimatedPrice,
              priority: item.priority,
              categoryId: item.categoryId,
            })),
          },
        },
        include: includeRequestDetail,
      });
      return request;
    });

    res.status(201).json(result);
  } catch (_error) {
    res.status(400).json({ message: '创建采购申请失败', error: (_error as any).message });
  }
});

router.put('/requests/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const payload = updateProcurementRequestSchema.parse(req.body);

    const existing = await prisma.procurementRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '采购申请不存在' });
    if (existing.status !== 'PENDING') return res.status(400).json({ message: '只能编辑待审核状态的申请' });
    if (req.user!.role === Role.LIBRARIAN && existing.requestedById !== req.user!.id) {
      return res.status(403).json({ message: '只能编辑自己提交的申请' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (payload.subject) updateData.subject = payload.subject;
      if (payload.reason) updateData.reason = payload.reason;
      if (payload.fundSubject) updateData.fundSubject = payload.fundSubject;

      const request = await tx.procurementRequest.update({
        where: { id },
        data: updateData,
        include: includeRequestDetail,
      });

      if (payload.items && payload.items.length > 0) {
        await tx.procurementRequestItem.deleteMany({ where: { requestId: id } });
        await tx.procurementRequestItem.createMany({
          data: payload.items.map((item) => ({
            requestId: id,
            title: item.title,
            author: item.author,
            isbn: item.isbn,
            publisher: item.publisher,
            requestedQty: item.requestedQty,
            estimatedPrice: item.estimatedPrice,
            priority: item.priority,
            categoryId: item.categoryId,
          })),
        });
      }

      return request;
    });

    const refreshed = await prisma.procurementRequest.findUnique({
      where: { id },
      include: includeRequestDetail,
    });
    res.json(refreshed);
  } catch (_error) {
    res.status(400).json({ message: '更新采购申请失败', error: (_error as any).message });
  }
});

router.delete('/requests/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.procurementRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '采购申请不存在' });
    if (existing.status !== 'PENDING') return res.status(400).json({ message: '只能删除待审核状态的申请' });
    if (req.user!.role === Role.LIBRARIAN && existing.requestedById !== req.user!.id) {
      return res.status(403).json({ message: '只能删除自己提交的申请' });
    }

    await prisma.procurementRequest.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (_error) {
    res.status(400).json({ message: '删除采购申请失败', error: (_error as any).message });
  }
});

router.put('/requests/:id/review', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const payload = reviewProcurementRequestSchema.parse(req.body);

    const existing = await prisma.procurementRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ message: '采购申请不存在' });
    if (existing.status !== 'PENDING') return res.status(400).json({ message: '只能审核待审核状态的申请' });

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.procurementRequest.update({
        where: { id },
        data: {
          status: payload.status,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
          reviewNote: payload.reviewNote,
        },
        include: includeRequestDetail,
      });

      if (payload.items && payload.items.length > 0) {
        for (const item of payload.items) {
          await tx.procurementRequestItem.update({
            where: { id: item.id },
            data: {
              approvedQty: item.approvedQty,
              adjustedNote: item.adjustedNote,
              priority: item.priority,
            },
          });
        }
      } else if (payload.status === 'APPROVED') {
        for (const item of existing.items) {
          await tx.procurementRequestItem.update({
            where: { id: item.id },
            data: { approvedQty: item.requestedQty },
          });
        }
      }

      return request;
    });

    const refreshed = await prisma.procurementRequest.findUnique({
      where: { id },
      include: includeRequestDetail,
    });
    res.json(refreshed);
  } catch (_error) {
    res.status(400).json({ message: '审核采购申请失败', error: (_error as any).message });
  }
});

// ============= 采购单 =============

router.get('/orders', authenticate, async (req: AuthRequest, res) => {
  try {
    const query = procurementOrderFilterSchema.parse(req.query);
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.requestId) where.requestId = query.requestId;

    if (query.keyword) {
      where.OR = [
        { orderNo: { contains: query.keyword } },
        { supplier: { contains: query.keyword } },
        { request: { requestNo: { contains: query.keyword } } },
        { items: { some: { OR: [
          { title: { contains: query.keyword } },
          { isbn: { contains: query.keyword } },
        ] } },
      ];
    }
    if (query.startDate) where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    if (query.endDate) where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };

    const orders = await prisma.procurementOrder.findMany({
      where,
      include: includeOrderDetail,
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (_error) {
    res.status(400).json({ message: '获取采购单列表失败', error: (_error as any).message });
  }
});

router.get('/orders/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.procurementOrder.findUnique({
      where: { id: Number(req.params.id) },
      include: includeOrderDetail,
    });
    if (!order) return res.status(404).json({ message: '采购单不存在' });
    res.json(order);
  } catch (_error) {
    res.status(400).json({ message: '获取采购单失败', error: (_error as any).message });
  }
});

router.post('/orders', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const payload = createProcurementOrderSchema.parse(req.body);

    const totalAmount = payload.items.reduce((sum, item) => sum + item.orderQty * item.unitPrice, 0);

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.procurementOrder.create({
        data: {
          orderNo: generateNo('PO'),
          requestId: payload.requestId,
          supplier: payload.supplier,
          contactPerson: payload.contactPerson,
          contactPhone: payload.contactPhone,
          expectedArrival: payload.expectedArrival ? new Date(payload.expectedArrival) : undefined,
          totalAmount,
          createdById: req.user!.id,
          status: 'CREATED',
          items: {
            create: payload.items.map((item) => ({
              requestItemId: item.requestItemId,
              title: item.title,
              author: item.author,
              isbn: item.isbn,
              publisher: item.publisher,
              orderQty: item.orderQty,
              unitPrice: item.unitPrice,
              priority: item.priority,
              categoryId: item.categoryId,
            })),
          },
        },
        include: includeOrderDetail,
      });
      return order;
    });

    res.status(201).json(result);
  } catch (_error) {
    res.status(400).json({ message: '创建采购单失败', error: (_error as any).message });
  }
});

router.put('/orders/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = updateProcurementOrderSchema.parse(req.body);

    const existing = await prisma.procurementOrder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '采购单不存在' });

    const updateData: any = {};
    if (payload.supplier) updateData.supplier = payload.supplier;
    if (payload.contactPerson !== undefined) updateData.contactPerson = payload.contactPerson;
    if (payload.contactPhone !== undefined) updateData.contactPhone = payload.contactPhone;
    if (payload.expectedArrival !== undefined) {
      updateData.expectedArrival = payload.expectedArrival ? new Date(payload.expectedArrival) : null;
    }
    if (payload.status) {
      updateData.status = payload.status;
      if (payload.status === 'ORDERED') updateData.orderedAt = new Date();
      if (payload.status === 'COMPLETED') updateData.completedAt = new Date();
    }

    const order = await prisma.procurementOrder.update({
      where: { id },
      data: updateData,
      include: includeOrderDetail,
    });

    res.json(order);
  } catch (_error) {
    res.status(400).json({ message: '更新采购单失败', error: (_error as any).message });
  }
});

// ============= 到货记录 =============

router.post('/arrivals', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = createArrivalRecordSchema.parse(req.body);
    const totalReceived = payload.items.reduce((sum, item) => sum + item.receivedQty, 0);

    const result = await prisma.$transaction(async (tx) => {
      const arrival = await tx.arrivalRecord.create({
        data: {
          arrivalNo: generateNo('AR'),
          orderId: payload.orderId,
          arrivalDate: payload.arrivalDate ? new Date(payload.arrivalDate) : new Date(),
          totalReceived,
          remark: payload.remark,
          operatorId: req.user!.id,
          items: {
            create: payload.items.map((item) => ({
              orderItemId: item.orderItemId,
              title: item.title,
              isbn: item.isbn,
              receivedQty: item.receivedQty,
              unitPrice: item.unitPrice,
              remark: item.remark,
            })),
          },
        },
        include: {
          operator: { select: { id: true, username: true } },
          items: {
            include: {
              stockInBy: { select: { id: true, username: true } },
            },
          },
          order: {
            include: { items: true },
          },
        },
      });

      for (const item of payload.items) {
        const orderItem = await tx.procurementOrderItem.findUnique({
          where: { id: item.orderItemId },
        });
        if (orderItem) {
          await tx.procurementOrderItem.update({
            where: { id: item.orderItemId },
            data: { receivedQty: orderItem.receivedQty + item.receivedQty },
          });
        }
      }

      const order = await tx.procurementOrder.findUnique({
        where: { id: payload.orderId },
        include: { items: true },
      });
      if (order) {
        const totalOrderQty = order.items.reduce((s, i) => s + i.orderQty, 0);
        const totalReceivedQty = order.items.reduce((s, i) => s + i.receivedQty, 0);
        let status = order.status;
        if (totalReceivedQty >= totalOrderQty) status = 'FULLY_ARRIVED';
        else if (totalReceivedQty > 0) status = 'PARTIAL_ARRIVED';
        await tx.procurementOrder.update({
          where: { id: payload.orderId },
          data: { status },
        });
      }

      return arrival;
    });

    res.status(201).json(result);
  } catch (_error) {
    res.status(400).json({ message: '创建到货记录失败', error: (_error as any).message });
  }
});

// ============= 退货记录 =============

router.post('/returns', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const payload = createReturnRecordSchema.parse(req.body);
    const totalReturned = payload.items.reduce((sum, item) => sum + item.returnedQty, 0);
    const totalRefund = payload.items.reduce((sum, item) => sum + item.refundAmount, 0);

    const result = await prisma.$transaction(async (tx) => {
      const returnRec = await tx.returnRecord.create({
        data: {
          returnNo: generateNo('RT'),
          orderId: payload.orderId,
          returnDate: payload.returnDate ? new Date(payload.returnDate) : new Date(),
          totalReturned,
          totalRefund,
          reason: payload.reason,
          operatorId: req.user!.id,
          items: {
            create: payload.items.map((item) => ({
              orderItemId: item.orderItemId,
              title: item.title,
              isbn: item.isbn,
              returnedQty: item.returnedQty,
              unitPrice: item.unitPrice,
              refundAmount: item.refundAmount,
              reason: item.reason,
            })),
          },
        },
        include: {
          operator: { select: { id: true, username: true } },
          items: true,
        },
      });

      for (const item of payload.items) {
        const orderItem = await tx.procurementOrderItem.findUnique({
          where: { id: item.orderItemId },
        });
        if (orderItem) {
          await tx.procurementOrderItem.update({
            where: { id: item.orderItemId },
            data: { returnedQty: orderItem.returnedQty + item.returnedQty },
          });
        }
      }

      return returnRec;
    });

    res.status(201).json(result);
  } catch (_error) {
    res.status(400).json({ message: '创建退货记录失败', error: (_error as any).message });
  }
});

// ============= 入库 =============

router.post('/stock-in', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req: AuthRequest, res) => {
  try {
    const payload = stockInSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const arrivalItems = await tx.arrivalRecordItem.findMany({
        where: { id: { in: payload.arrivalItemIds } },
        include: {
          orderItem: true,
        },
      });

      if (arrivalItems.length === 0) {
        throw new Error('未找到有效的到货明细');
      }

      const stockInResults = [];

      for (const arrivalItem of arrivalItems) {
        if (arrivalItem.stockInStatus) continue;

        const orderItem = arrivalItem.orderItem;
        if (!orderItem) continue;

        const existingBook = await tx.book.findFirst({
          where: { isbn: arrivalItem.isbn },
        });

        const qty = arrivalItem.receivedQty;

        if (existingBook) {
          await tx.book.update({
            where: { id: existingBook.id },
            data: {
              stock: { increment: qty },
              price: arrivalItem.unitPrice,
            },
          });
        } else {
          const categoryId = orderItem.categoryId || 1;
          await tx.book.create({
            data: {
              title: arrivalItem.title,
              author: orderItem.author,
              isbn: arrivalItem.isbn,
              stock: qty,
              price: arrivalItem.unitPrice,
              categoryId,
              location: orderItem.category?.name || undefined,
            },
          });
        }

        const updated = await tx.arrivalRecordItem.update({
          where: { id: arrivalItem.id },
          data: {
            stockInStatus: true,
            stockInAt: new Date(),
            stockInById: req.user!.id,
          },
        });

        const newStockInQty = orderItem.stockInQty + qty;
        await tx.procurementOrderItem.update({
          where: { id: orderItem.id },
          data: { stockInQty: newStockInQty },
        });

        stockInResults.push(updated);
      }

      const allArrivalIds = [...new Set(arrivalItems.map((i) => i.arrivalRecordId))];
      for (const aid of allArrivalIds) {
        const order = await tx.procurementOrder.findFirst({
          where: { arrivalRecords: { some: { id: aid } } },
          include: { items: true },
        });
        if (order) {
          const totalOrder = order.items.reduce((s, i) => s + i.orderQty, 0);
          const totalStockIn = order.items.reduce((s, i) => s + i.stockInQty, 0);
          if (totalStockIn >= totalOrder) {
            await tx.procurementOrder.update({
              where: { id: order.id },
              data: { status: 'COMPLETED', completedAt: new Date() },
            });
          }
        }
      }

      return stockInResults;
    });

    res.json({ message: '入库成功', count: result.length, items: result });
  } catch (_error) {
    res.status(400).json({ message: '入库失败', error: (_error as any).message });
  }
});

// ============= 采购台账（汇总查询） =============

router.get('/ledger', authenticate, async (_req, res) => {
  try {
    const requests = await prisma.procurementRequest.findMany({
      include: {
        requestedBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        items: {
          include: {
            category: true,
            orderItems: {
              include: {
                arrivalItems: {
                  include: {
                    stockInBy: { select: { id: true, username: true } },
                  },
                },
                returnItems: true,
              },
            },
          },
        },
        orders: {
          include: {
            createdBy: { select: { id: true, username: true } },
            arrivalRecords: {
              include: {
                operator: { select: { id: true, username: true } },
              },
            },
            returnRecords: {
              include: {
                operator: { select: { id: true, username: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalRequests: requests.length,
      pendingRequests: requests.filter((r) => r.status === 'PENDING').length,
      approvedRequests: requests.filter((r) => r.status === 'APPROVED' || r.status === 'PARTIAL_APPROVED').length,
      rejectedRequests: requests.filter((r) => r.status === 'REJECTED').length,
      totalOrders: requests.reduce((s, r) => s + r.orders.length, 0),
      totalAmount: requests.reduce((s, r) => s + r.orders.reduce((so, o) => so + o.totalAmount, 0), 0),
      totalItems: requests.reduce((s, r) => s + r.items.length, 0),
      totalStockIn: requests.reduce(
        (s, r) =>
          s +
          r.items.reduce(
            (si, it) => si + it.orderItems.reduce((so, oi) => so + oi.stockInQty, 0),
            0
          ),
        0
      ),
    };

    res.json({ requests, stats });
  } catch (_error) {
    res.status(400).json({ message: '获取采购台账失败', error: (_error as any).message });
  }
});

export default router;

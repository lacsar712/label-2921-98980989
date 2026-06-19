import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import {
  createMessageSchema,
  messageFilterSchema,
  createTemplateSchema,
  updateTemplateSchema,
} from '../validators';
import { Role, MessageType, PriorityLevel, TargetType, Prisma } from '@prisma/client';

const router = Router();

const messageInclude = {
  sender: {
    select: { id: true, username: true, role: true },
  },
  receipts: {
    where: { userId: 0 },
    select: { isRead: true, readAt: true, userId: true },
  },
} as const;

const getReceiptSelect = (userId: number) => ({
  where: { userId },
  select: { isRead: true, readAt: true },
});

router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const unreadCount = await prisma.messageReceipt.count({
      where: {
        userId,
        isRead: false,
      },
    });

    const priorityBreakdown = await prisma.messageReceipt.groupBy({
      by: ['messageId'],
      where: {
        userId,
        isRead: false,
      },
      _count: true,
    });

    const messageIds = priorityBreakdown.map((item) => item.messageId);
    const messages = await prisma.message.findMany({
      where: { id: { in: messageIds } },
      select: { id: true, priority: true },
    });

    const priorityMap = new Map<PriorityLevel, number>();
    for (const priority of Object.values(PriorityLevel)) {
      priorityMap.set(priority, 0);
    }

    for (const msg of messages) {
      const current = priorityMap.get(msg.priority) || 0;
      priorityMap.set(msg.priority, current + 1);
    }

    res.json({
      total: unreadCount,
      byPriority: Object.fromEntries(priorityMap),
    });
  } catch (_error) {
    res.status(500).json({ message: '获取未读数失败' });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const query = messageFilterSchema.parse(req.query);

    const where: Prisma.MessageReceiptWhereInput = {
      userId,
      message: {
        type: query.type,
        priority: query.priority,
        createdAt: {
          gte: query.startDate ? new Date(query.startDate) : undefined,
          lte: query.endDate
            ? new Date(new Date(query.endDate).setHours(23, 59, 59, 999))
            : undefined,
        },
        AND: query.keyword
          ? [
              {
                OR: [
                  { title: { contains: query.keyword, mode: 'insensitive' } },
                  { content: { contains: query.keyword, mode: 'insensitive' } },
                ],
              },
            ]
          : undefined,
      },
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const skip = (query.page - 1) * query.pageSize;
    const take = query.pageSize;

    const [total, receipts] = await Promise.all([
      prisma.messageReceipt.count({ where }),
      prisma.messageReceipt.findMany({
        where,
        skip,
        take,
        orderBy: [
          { message: { priority: 'desc' } },
          { message: { createdAt: 'desc' } },
        ],
        include: {
          message: {
            include: {
              sender: {
                select: { id: true, username: true, role: true },
              },
            },
          },
        },
      }),
    ]);

    const result = receipts.map((receipt) => ({
      id: receipt.id,
      messageId: receipt.messageId,
      title: receipt.message.title,
      content: receipt.message.content,
      type: receipt.message.type,
      priority: receipt.message.priority,
      sender: receipt.message.sender,
      isRead: receipt.isRead,
      readAt: receipt.readAt,
      createdAt: receipt.message.createdAt,
    }));

    res.json({
      data: result,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (_error) {
    res.status(500).json({ message: '获取消息列表失败' });
  }
});

router.post('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const messageId = Number(req.params.id);

    const receipt = await prisma.messageReceipt.findFirst({
      where: { userId, messageId },
    });

    if (!receipt) {
      return res.status(404).json({ message: '消息不存在' });
    }

    const updated = await prisma.messageReceipt.update({
      where: { id: receipt.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json(updated);
  } catch (_error) {
    res.status(500).json({ message: '标记已读失败' });
  }
});

router.post('/read-batch', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { messageIds } = req.body as { messageIds?: number[] };

    if (!messageIds || messageIds.length === 0) {
      return res.status(400).json({ message: '请选择要标记的消息' });
    }

    await prisma.messageReceipt.updateMany({
      where: {
        userId,
        messageId: { in: messageIds },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ message: '批量标记已读成功' });
  } catch (_error) {
    res.status(500).json({ message: '批量标记已读失败' });
  }
});

router.post('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    await prisma.messageReceipt.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ message: '全部标记已读成功' });
  } catch (_error) {
    res.status(500).json({ message: '全部标记已读失败' });
  }
});

router.post('/', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const senderId = req.user!.id;
    const body = createMessageSchema.parse(req.body);

    let title = body.title;
    let content = body.content;
    let type = body.type;
    let priority = body.priority;

    if (body.templateId) {
      const template = await prisma.messageTemplate.findUnique({
        where: { id: body.templateId },
      });
      if (!template) {
        return res.status(404).json({ message: '模板不存在' });
      }
      title = template.title;
      content = template.content;
      type = template.type;
      priority = template.priority;
    }

    let targetUserIds: number[] = [];

    switch (body.targetType) {
      case TargetType.ALL_USERS: {
        const users = await prisma.user.findMany({ select: { id: true } });
        targetUserIds = users.map((u) => u.id);
        break;
      }
      case TargetType.ALL_ADMINS: {
        const users = await prisma.user.findMany({
          where: { role: Role.ADMIN },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
        break;
      }
      case TargetType.ALL_LIBRARIANS: {
        const users = await prisma.user.findMany({
          where: { role: Role.LIBRARIAN },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
        break;
      }
      case TargetType.ROLE: {
        if (!body.targetRole) {
          return res.status(400).json({ message: '请指定目标角色' });
        }
        const users = await prisma.user.findMany({
          where: { role: body.targetRole },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
        break;
      }
      case TargetType.USER: {
        if (!body.targetUserIds || body.targetUserIds.length === 0) {
          return res.status(400).json({ message: '请指定目标用户' });
        }
        const users = await prisma.user.findMany({
          where: { id: { in: body.targetUserIds } },
          select: { id: true },
        });
        targetUserIds = users.map((u) => u.id);
        break;
      }
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ message: '未找到目标用户' });
    }

    const message = await prisma.message.create({
      data: {
        title,
        content,
        type,
        priority,
        targetType: body.targetType,
        targetRole: body.targetRole,
        senderId,
        receipts: {
          createMany: {
            data: targetUserIds.map((uid) => ({
              userId: uid,
            })),
          },
        },
      },
      include: {
        sender: { select: { id: true, username: true } },
        receipts: {
          take: 5,
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    });

    res.status(201).json({
      ...message,
      totalRecipients: targetUserIds.length,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: '验证失败', errors: error.issues });
    }
    res.status(500).json({ message: '发送消息失败' });
  }
});

router.get('/templates', authenticate, authorize([Role.ADMIN]), async (_req, res) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(templates);
  } catch (_error) {
    res.status(500).json({ message: '获取模板列表失败' });
  }
});

router.post('/templates', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const body = createTemplateSchema.parse(req.body);

    const exists = await prisma.messageTemplate.findUnique({
      where: { name: body.name },
    });
    if (exists) {
      return res.status(400).json({ message: '模板名称已存在' });
    }

    const template = await prisma.messageTemplate.create({
      data: body,
    });
    res.status(201).json(template);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: '验证失败', errors: error.issues });
    }
    res.status(500).json({ message: '创建模板失败' });
  }
});

router.put('/templates/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const body = updateTemplateSchema.parse(req.body);

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: body,
    });
    res.json(template);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ message: '验证失败', errors: error.issues });
    }
    res.status(500).json({ message: '更新模板失败' });
  }
});

router.delete('/templates/:id', authenticate, authorize([Role.ADMIN]), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.messageTemplate.delete({ where: { id } });
    res.json({ message: '删除模板成功' });
  } catch (_error) {
    res.status(500).json({ message: '删除模板失败' });
  }
});

export default router;

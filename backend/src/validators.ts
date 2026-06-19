import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, '用户名必填'),
  password: z.string().min(1, '密码必填'),
});

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'LIBRARIAN']).optional(),
});

export const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(5),
  categoryId: z.number().int(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  location: z.string().optional(),
  seriesId: z.number().int().optional(),
  volumeNumber: z.number().int().optional(),
});

export const bookUpdateSchema = bookSchema.partial().extend({ id: z.number().int().optional() });

export const categorySchema = z.object({
  name: z.string().min(1),
});

export const borrowSchema = z.object({
  bookId: z.number().int(),
});

export const scheduleSchema = z.object({
  userId: z.number().int().optional(),
  date: z.string().min(1),
  shiftType: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  serviceLocationId: z.number().int(),
  isLeader: z.boolean().optional(),
});

export const scheduleBatchSchema = z.object({
  schedules: z.array(scheduleSchema),
});

export const serviceLocationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['READING_ROOM', 'SERVICE_DESK']).default('READING_ROOM'),
});

export const shiftSwapSchema = z.object({
  targetUserId: z.number().int(),
  requesterScheduleId: z.number().int(),
  targetScheduleId: z.number().int(),
  reason: z.string().min(1),
});

export const messageTypeEnum = z.enum([
  'SYSTEM',
  'INVENTORY_ALERT',
  'RESERVATION_PENDING',
  'INVENTORY_REVIEW',
  'PROCUREMENT_ARRIVAL',
  'CUSTOM',
]);

export const priorityLevelEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const targetTypeEnum = z.enum([
  'USER',
  'ROLE',
  'ALL_ADMINS',
  'ALL_LIBRARIANS',
  'ALL_USERS',
]);

export const roleEnum = z.enum(['ADMIN', 'LIBRARIAN']);

export const createMessageSchema = z.object({
  title: z.string().min(1, '消息标题必填'),
  content: z.string().min(1, '消息内容必填'),
  type: messageTypeEnum.default('SYSTEM'),
  priority: priorityLevelEnum.default('MEDIUM'),
  targetType: targetTypeEnum.default('ALL_USERS'),
  targetRole: roleEnum.optional(),
  targetUserIds: z.array(z.number().int()).optional(),
  templateId: z.number().int().optional(),
});

export const messageFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: messageTypeEnum.optional(),
  priority: priorityLevelEnum.optional(),
  isRead: z.coerce.boolean().optional(),
  keyword: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, '模板名称必填'),
  title: z.string().min(1, '模板标题必填'),
  content: z.string().min(1, '模板内容必填'),
  type: messageTypeEnum.default('CUSTOM'),
  priority: priorityLevelEnum.default('MEDIUM'),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const seriesTypeEnum = z.enum(['MONOGRAPH', 'TEXTBOOK', 'JOURNAL_BOUND', 'COLLECTION', 'REFERENCE', 'OTHER']);
export const purchaseStatusEnum = z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED', 'PURCHASED']);

export const seriesSchema = z.object({
  name: z.string().min(1, '系列名称必填'),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  expectedTotalVolumes: z.number().int().min(1, '预期总册数必须大于0'),
  seriesType: seriesTypeEnum.default('OTHER'),
});

export const seriesUpdateSchema = seriesSchema.partial();

export const seriesVolumeSchema = z.object({
  seriesId: z.number().int(),
  bookId: z.number().int().optional(),
  volumeNumber: z.number().int().min(1, '册序号必须大于0'),
  isMissing: z.boolean().default(false),
  purchaseStatus: purchaseStatusEnum.default('NONE'),
});

export const seriesVolumeUpdateSchema = seriesVolumeSchema.partial().extend({
  id: z.number().int().optional(),
});

export const purchaseRequestSchema = z.object({
  seriesId: z.number().int(),
  volumeId: z.number().int(),
  reason: z.string().optional(),
  estimatedPrice: z.number().min(0).optional(),
});

export const purchaseRequestReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PURCHASED']),
  reviewNote: z.string().optional(),
});

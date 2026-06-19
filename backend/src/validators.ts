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

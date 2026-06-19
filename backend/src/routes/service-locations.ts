import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';
import { serviceLocationSchema } from '../validators';

const router = Router();

router.get('/', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const { type } = req.query;
    const locations = await prisma.serviceLocation.findMany({
      where: type ? { type: String(type) } : {},
      include: { _count: { select: { schedules: true } } },
      orderBy: { id: 'asc' },
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: '获取服务点列表失败' });
  }
});

router.get('/:id', authenticate, authorize([Role.ADMIN, Role.LIBRARIAN]), async (req, res) => {
  try {
    const location = await prisma.serviceLocation.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!location) {
      res.status(404).json({ message: '服务点不存在' });
      return;
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: '获取服务点详情失败' });
  }
});

router.post('/', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const payload = serviceLocationSchema.parse(req.body);
    const location = await prisma.serviceLocation.create({ data: payload });
    res.status(201).json(location);
  } catch (error) {
    res.status(400).json({ message: '创建服务点失败', error: (error as any).message });
  }
});

router.put('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const payload = serviceLocationSchema.partial().parse(req.body);
    const location = await prisma.serviceLocation.update({
      where: { id: Number(req.params.id) },
      data: payload,
    });
    res.json(location);
  } catch (error) {
    res.status(400).json({ message: '更新服务点失败', error: (error as any).message });
  }
});

router.delete('/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    await prisma.serviceLocation.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: '服务点已删除' });
  } catch (error) {
    res.status(400).json({ message: '删除服务点失败' });
  }
});

export default router;

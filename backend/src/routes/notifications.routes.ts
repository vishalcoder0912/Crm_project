// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { requirePermission } from '../middleware/rbac';
import { NotFoundError } from '../utils/errors';
import { parsePaginationParams, buildPaginatedResult, getPrismaSkipTake } from '../utils/pagination';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('notifications.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePaginationParams(req.query);
    const where: Record<string, unknown> = { userId: req.user!.userId };
    if (req.query.isRead !== undefined) {
      where.isRead = req.query.isRead === 'true';
    }

    const [totalItems, data] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        ...getPrismaSkipTake(params),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false },
    });

    res.json({ ...buildPaginatedResult(data, totalItems, params), unreadCount });
  })
);

router.post(
  '/:id/read',
  authenticate,
  requirePermission('notifications.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!notification) {
      throw new NotFoundError('Notification', id);
    }
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(updated);
  })
);

router.post(
  '/read-all',
  authenticate,
  requirePermission('notifications.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, updated: result.count });
  })
);

export default router;
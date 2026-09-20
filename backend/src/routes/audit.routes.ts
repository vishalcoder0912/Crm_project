import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePaginationParams, buildPaginatedResult, getPrismaSkipTake } from '../utils/pagination';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('audit.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePaginationParams(req.query);
    const where: Record<string, unknown> = {};

    for (const field of ['action', 'entityType', 'entityId', 'userId']) {
      if (req.query[field]) {
        where[field] = field === 'entityId' || field === 'userId'
          ? Number(req.query[field])
          : req.query[field];
      }
    }

    const [totalItems, data] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        ...getPrismaSkipTake(params),
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
    ]);

    res.json(buildPaginatedResult(data, totalItems, params));
  })
);

export default router;
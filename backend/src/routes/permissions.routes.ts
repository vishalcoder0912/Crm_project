// hello this is vishal project
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
  requirePermission('users.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePaginationParams(req.query);
    const where: Record<string, unknown> = {};

    const q = (req.query.q as string)?.trim();
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' as const } },
        { module: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ];
    }
    if (req.query.module) {
      where.module = req.query.module;
    }

    const [totalItems, data] = await Promise.all([
      prisma.permission.count({ where }),
      prisma.permission.findMany({
        where,
        ...getPrismaSkipTake(params),
        orderBy: { module: 'asc' },
      }),
    ]);

    res.json(buildPaginatedResult(data, totalItems, params));
  })
);

export default router;
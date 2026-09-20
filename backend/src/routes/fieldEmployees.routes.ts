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
  requirePermission('installations.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePaginationParams(req.query);
    const where: Record<string, unknown> = {};

    const q = (req.query.q as string)?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { role: { contains: q, mode: 'insensitive' } },
        { businessId: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (req.query.role) where.role = req.query.role;
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';

    const [totalItems, data] = await Promise.all([
      prisma.fieldEmployee.count({ where }),
      prisma.fieldEmployee.findMany({
        where,
        ...getPrismaSkipTake(params),
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { installations: true, tracking: true, vehicleTrips: true } },
        },
      }),
    ]);

    res.json(buildPaginatedResult(data, totalItems, params));
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('installations.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const record = await prisma.fieldEmployee.findUnique({
      where: { id },
      include: {
        installations: {
          include: { installation: true },
          orderBy: { id: 'desc' },
          take: 20,
        },
        tracking: { orderBy: { id: 'desc' }, take: 20 },
        vehicleTrips: { include: { vehicle: true }, orderBy: { id: 'desc' }, take: 20 },
      },
    });
    if (!record) {
      res.status(404).json({ error: { message: 'Field employee not found' } });
      return;
    }
    res.json(record);
  })
);

export default router;

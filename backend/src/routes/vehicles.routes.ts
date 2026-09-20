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
        { registrationNo: { contains: q, mode: 'insensitive' } },
        { vehicleType: { contains: q, mode: 'insensitive' } },
        { assignedTeam: { contains: q, mode: 'insensitive' } },
        { businessId: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (req.query.status) where.status = req.query.status;
    if (req.query.vehicleType) where.vehicleType = req.query.vehicleType;

    const [totalItems, data] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        ...getPrismaSkipTake(params),
        orderBy: { registrationNo: 'asc' },
        include: {
          _count: { select: { trips: true, installations: true } },
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
    const record = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        trips: {
          include: { fieldEmployee: true },
          orderBy: { id: 'desc' },
          take: 30,
        },
        installations: { orderBy: { id: 'desc' }, take: 20 },
      },
    });
    if (!record) {
      res.status(404).json({ error: { message: 'Vehicle not found' } });
      return;
    }
    res.json(record);
  })
);

export default router;

// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog } from '../utils/helpers';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('inventory.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const where: Record<string, unknown> = {};
    if (req.query.skuId) where.skuId = Number(req.query.skuId);
    if (req.query.warehouse) where.warehouse = req.query.warehouse;
    if (req.query.available) {
      where.availableQty = req.query.available === 'true' ? { gt: 0 } : undefined;
    }

    const stock = await prisma.stock.findMany({
      where,
      orderBy: { sku: { name: 'asc' } },
      include: { sku: { include: { product: true } } },
    });
    res.json(stock);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('inventory.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const stock = await prisma.stock.findUnique({
      where: { id },
      include: { sku: { include: { product: true } } },
    });
    if (!stock) {
      throw new NotFoundError('Stock', id);
    }
    res.json(stock);
  })
);

router.post(
  '/:id/adjust',
  authenticate,
  requirePermission('inventory.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { delta, reason } = req.body as { delta: number; reason: string };

    const stock = await prisma.stock.findUnique({ where: { id } });
    if (!stock) {
      throw new NotFoundError('Stock', id);
    }
    if (!reason) {
      throw new ValidationError('reason is required for stock adjustments');
    }
    const change = Number(delta);
    if (isNaN(change) || change === 0) {
      throw new ValidationError('delta must be a non-zero number');
    }
    const newAvailable = Number(stock.availableQty) + change;
    if (newAvailable < 0) {
      throw new BusinessRuleError('Stock cannot go negative');
    }

    const updated = await prisma.stock.update({
      where: { id },
      data: { availableQty: newAvailable },
      include: { sku: true },
    });

    await createAuditLog(req, 'UPDATE', 'stock', id, stock, updated);
    res.json({ success: true, stock: updated });
  })
);

export default router;
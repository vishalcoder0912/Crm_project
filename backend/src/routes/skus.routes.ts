import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog } from '../utils/helpers';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'sku',
    entity: 'SKU',
    searchFields: ['sku', 'name'],
    filterFields: ['productId', 'vendorId', 'isActive'],
    orderBy: { name: 'asc' },
    includes: {
      product: { select: { id: true, name: true, category: true } },
      vendor: { select: { id: true, name: true } },
      stocks: true,
    },
    permissions: {
      read: 'skus.read',
      create: 'skus.create',
      update: 'skus.update',
      remove: 'skus.delete',
    },
    createBody: async (req) => {
      const body = req.body as any;
      if (!body.sku || !body.productId || !body.name) {
        throw new ValidationError('sku, productId and name are required');
      }
      const product = await prisma.product.findUnique({ where: { id: Number(body.productId) } });
      if (!product) {
        throw new ValidationError('productId does not exist');
      }
      return { ...body, vendorId: body.vendorId ?? undefined };
    },
  })
);

router.post(
  '/:id/price',
  authenticate,
  requirePermission('skus.update_price'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { costPrice, sellingPrice, serviceCharge, reason } = req.body as any;

    const sku = await prisma.sku.findUnique({ where: { id } });
    if (!sku) {
      throw new NotFoundError('SKU', id);
    }

    if (costPrice === undefined && sellingPrice === undefined && serviceCharge === undefined) {
      throw new ValidationError('Provide at least one of costPrice, sellingPrice, serviceCharge');
    }
    if (!reason) {
      throw new ValidationError('reason is required for price changes');
    }

    const updated = await prisma.$transaction([
      prisma.priceHistory.create({
        data: {
          skuId: sku.id,
          oldCostPrice: sku.costPrice,
          newCostPrice: costPrice ?? sku.costPrice,
          oldSellingPrice: sku.sellingPrice,
          newSellingPrice: sellingPrice ?? sku.sellingPrice,
          oldServiceCharge: sku.serviceCharge,
          newServiceCharge: serviceCharge ?? sku.serviceCharge,
          reason,
          changedById: req.user!.userId,
        },
      }),
      prisma.sku.update({
        where: { id },
        data: {
          costPrice: costPrice ?? sku.costPrice,
          sellingPrice: sellingPrice ?? sku.sellingPrice,
          serviceCharge: serviceCharge ?? sku.serviceCharge,
        },
      }),
    ]);

    await createAuditLog(req, 'PRICE_CHANGE', 'sku', id, sku, updated[1]);

    res.json({ success: true, sku: updated[1], history: updated[0] });
  })
);

router.get(
  '/:id/price-history',
  authenticate,
  requirePermission('skus.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const history = await prisma.priceHistory.findMany({
      where: { skuId: id },
      orderBy: { changedAt: 'desc' },
      include: { changedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json(history);
  })
);

export default router;
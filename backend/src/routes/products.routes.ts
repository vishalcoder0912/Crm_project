// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { NotFoundError, ValidationError } from '../utils/errors';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'product',
    entity: 'Product',
    softDelete: true,
    searchFields: ['name', 'category', 'productType'],
    filterFields: ['category', 'isActive'],
    orderBy: { name: 'asc' },
    includes: { skus: true },
    permissions: {
      read: 'products.read',
      create: 'products.create',
      update: 'products.update',
      remove: 'products.delete',
    },
    createBody: async (req) => {
      const body = req.body as any;
      if (!body.name || !body.category) {
        throw new ValidationError('name and category are required');
      }
      return body;
    },
  })
);

router.get(
  '/:id/skus',
  authenticate,
  requirePermission('products.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { skus: { where: { deletedAt: null } } },
    });
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    res.json(product.skus);
  })
);

export default router;
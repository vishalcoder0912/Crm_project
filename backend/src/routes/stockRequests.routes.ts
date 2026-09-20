import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog, createNotification } from '../utils/helpers';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'stockRequest',
    entity: 'Stock Request',
    prefixKey: 'stockRequest',
    tableName: 'stock_requests',
    searchFields: ['businessId'],
    filterFields: ['orderId', 'skuId', 'status', 'warehouse'],
    orderBy: { createdAt: 'desc' },
    includes: {
      order: { select: { id: true, businessId: true } },
      sku: { select: { id: true, sku: true, name: true } },
      requestedBy: { select: { id: true, firstName: true, lastName: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    permissions: {
      read: 'stock_requests.read',
      create: 'stock_requests.create',
      update: 'stock_requests.read',
      remove: 'stock_requests.create',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const order = await prisma.order.findUnique({ where: { id: Number(body.orderId) } });
      if (!order) {
        throw new ValidationError('orderId does not exist');
      }
      const sku = await prisma.sku.findUnique({ where: { id: Number(body.skuId) } });
      if (!sku) {
        throw new ValidationError('skuId does not exist');
      }
      if (!body.requestedQty) {
        throw new ValidationError('requestedQty is required');
      }
      return {
        orderId: order.id,
        skuId: sku.id,
        orderQty: body.orderQty ?? body.requestedQty,
        requestedQty: body.requestedQty,
        warehouse: body.warehouse ?? 'MAIN',
        status: 'DRAFT',
        requestedById: req.user!.userId,
        notes: body.notes ?? null,
      };
    },
  })
);

router.post(
  '/:id/submit',
  authenticate,
  requirePermission('stock_requests.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const stockRequest = await prisma.stockRequest.findUnique({ where: { id } });
    if (!stockRequest) {
      throw new NotFoundError('Stock Request', id);
    }
    if (stockRequest.status !== 'DRAFT') {
      throw new BusinessRuleError(`Cannot submit a ${stockRequest.status} stock request`);
    }
    const updated = await prisma.stockRequest.update({ where: { id }, data: { status: 'SUBMITTED' } });
    res.json(updated);
  })
);

router.post(
  '/:id/approve',
  authenticate,
  requirePermission('stock_requests.approve'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const stockRequest = await prisma.stockRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!stockRequest) {
      throw new NotFoundError('Stock Request', id);
    }
    if (stockRequest.status !== 'SUBMITTED') {
      throw new BusinessRuleError(`Cannot approve a ${stockRequest.status} stock request`);
    }

    const stock = await prisma.stock.findFirst({
      where: { skuId: stockRequest.skuId, warehouse: stockRequest.warehouse },
    });
    if (!stock) {
      throw new BusinessRuleError('No stock record exists for this SKU in the requested warehouse');
    }
    if (Number(stock.availableQty) < Number(stockRequest.requestedQty)) {
      throw new BusinessRuleError(
        `Insufficient stock. Available: ${stock.availableQty}, Requested: ${stockRequest.requestedQty}`
      );
    }

    const updated = await prisma.$transaction([
      prisma.stock.update({
        where: { id: stock.id },
        data: { reservedQty: Number(stock.reservedQty) + Number(stockRequest.requestedQty) },
      }),
      prisma.stockRequest.update({
        where: { id },
        data: { status: 'APPROVED', approvedById: req.user!.userId, approvedAt: new Date() },
      }),
    ]);

    await createAuditLog(req, 'APPROVE', 'stock_request', id, stockRequest.status, 'APPROVED');
    await createNotification(
      stockRequest.requestedById,
      'STOCK_APPROVED',
      'Stock Request Approved',
      `Stock request ${stockRequest.businessId} was approved`
    );

    res.json(updated[1]);
  })
);

router.post(
  '/:id/issue',
  authenticate,
  requirePermission('stock_requests.approve'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { issuedQty } = req.body as { issuedQty: number };

    const stockRequest = await prisma.stockRequest.findUnique({ where: { id } });
    if (!stockRequest) {
      throw new NotFoundError('Stock Request', id);
    }
    if (stockRequest.status !== 'APPROVED') {
      throw new BusinessRuleError(`Cannot issue a ${stockRequest.status} stock request`);
    }

    const quantity = Number(issuedQty ?? stockRequest.requestedQty);
    if (quantity <= 0 || quantity > Number(stockRequest.requestedQty) - Number(stockRequest.issuedQty)) {
      throw new ValidationError('issuedQty exceeds remaining requested quantity');
    }

    const stock = await prisma.stock.findFirst({
      where: { skuId: stockRequest.skuId, warehouse: stockRequest.warehouse },
    });
    if (!stock) {
      throw new BusinessRuleError('No stock record found for this SKU');
    }
    if (Number(stock.reservedQty) < quantity) {
      throw new BusinessRuleError('Reserved stock is less than the issued quantity');
    }

    const newIssued = Number(stockRequest.issuedQty) + quantity;
    const status = newIssued >= Number(stockRequest.requestedQty) ? 'ISSUED' : 'PROCESSING';

    const updated = await prisma.$transaction([
      prisma.stock.update({
        where: { id: stock.id },
        data: {
          reservedQty: Number(stock.reservedQty) - quantity,
          availableQty: Number(stock.availableQty) - quantity,
          issuedQty: Number(stock.issuedQty) + quantity,
        },
      }),
      prisma.stockRequest.update({
        where: { id },
        data: {
          issuedQty: newIssued,
          status,
          ...(status === 'ISSUED' ? { approvedById: req.user!.userId } : {}),
        },
      }),
    ]);

    await createAuditLog(req, 'UPDATE', 'stock_request', id, undefined, { issuedQty: quantity });
    res.json(updated[1]);
  })
);

router.post(
  '/:id/cancel',
  authenticate,
  requirePermission('stock_requests.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const stockRequest = await prisma.stockRequest.findUnique({ where: { id } });
    if (!stockRequest) {
      throw new NotFoundError('Stock Request', id);
    }
    if (stockRequest.status === 'ISSUED' || stockRequest.status === 'COMPLETED') {
      throw new BusinessRuleError(`Cannot cancel a ${stockRequest.status} stock request`);
    }

    if (stockRequest.status === 'APPROVED') {
      const stock = await prisma.stock.findFirst({
        where: { skuId: stockRequest.skuId, warehouse: stockRequest.warehouse },
      });
      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: {
            reservedQty: Math.max(0, Number(stock.reservedQty) - Number(stockRequest.requestedQty)),
          },
        });
      }
    }

    const updated = await prisma.stockRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    res.json(updated);
  })
);

export default router;
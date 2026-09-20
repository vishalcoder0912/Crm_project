// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { generateBusinessId } from '../utils/idGenerator';
import { createAuditLog, round2 } from '../utils/helpers';

const router = Router();

const PO_INCLUDES = {
  vendor: { select: { id: true, name: true, gstNumber: true } },
  order: { select: { id: true, businessId: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  items: { include: { sku: true } },
  goodsReceipts: true,
};

interface POItemInput {
  skuId: number;
  quantity: number;
  rate: number;
  notes?: string;
}

async function resolvePOItems(items: POItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('At least one PO item is required');
  }
  const skuIds = [...new Set(items.map((i) => Number(i.skuId)))];
  const skus = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
  if (skus.length !== skuIds.length) {
    throw new ValidationError('One or more SKUs are invalid');
  }
  const skuMap = new Map(skus.map((s) => [s.id, s]));

  return items.map((item) => {
    const sku = skuMap.get(Number(item.skuId))!;
    const quantity = Number(item.quantity);
    const rate = Number(item.rate);
    if (!quantity || quantity <= 0) {
      throw new ValidationError('quantity must be greater than zero');
    }
    if (isNaN(rate) || rate < 0) {
      throw new ValidationError('rate is required');
    }
    return {
      skuId: sku.id,
      quantity,
      rate,
      amount: round2(quantity * rate),
      receivedQty: 0,
      notes: item.notes ?? null,
    };
  });
}

router.use(
  '/',
  createCrudRouter({
    model: 'purchaseOrder',
    entity: 'Purchase Order',
    prefixKey: 'purchaseOrder',
    tableName: 'purchase_orders',
    softDelete: true,
    searchFields: ['businessId', 'portalReference'],
    filterFields: ['vendorId', 'orderId', 'status'],
    orderBy: { createdAt: 'desc' },
    includes: PO_INCLUDES,
    permissions: {
      read: 'purchase_orders.read',
      create: 'purchase_orders.create',
      update: 'purchase_orders.update',
      remove: 'purchase_orders.update',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const vendor = await prisma.vendor.findUnique({ where: { id: Number(body.vendorId) } });
      if (!vendor) {
        throw new ValidationError('vendorId does not exist');
      }
      if (body.orderId) {
        const order = await prisma.order.findUnique({ where: { id: Number(body.orderId) } });
        if (!order) {
          throw new ValidationError('orderId does not exist');
        }
      }
      const items = await resolvePOItems(body.items);
      const totalAmount = round2(items.reduce((s, i) => s + i.amount, 0));
      return {
        vendorId: vendor.id,
        orderId: body.orderId ?? null,
        totalAmount,
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
        terms: body.terms ?? null,
        portalRequired: body.portalRequired ?? false,
        portalReference: body.portalReference ?? null,
        portalStatus: body.portalStatus ?? null,
        status: 'DRAFT',
        createdById: req.user!.userId,
        notes: body.notes ?? null,
        items: { create: items },
      };
    },
    updateBody: async (_req, body) => {
      const { items, ...rest } = body;
      const data: Record<string, unknown> = { ...rest };
      if (Array.isArray(items) && items.length > 0) {
        data.items = { create: await resolvePOItems(items) };
      }
      if (data.totalAmount) delete data.totalAmount;
      return data;
    },
  })
);

router.post(
  '/:id/approve',
  authenticate,
  requirePermission('purchase_orders.approve'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new NotFoundError('Purchase Order', id);
    }
    if (po.status !== 'DRAFT' && po.status !== 'SUBMITTED') {
      throw new BusinessRuleError(`Cannot approve a ${po.status} purchase order`);
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: req.user!.userId, approvedAt: new Date() },
      include: PO_INCLUDES,
    });
    await createAuditLog(req, 'APPROVE', 'purchase_order', id, po.status, 'APPROVED');
    res.json(updated);
  })
);

router.post(
  '/:id/send',
  authenticate,
  requirePermission('purchase_orders.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new NotFoundError('Purchase Order', id);
    }
    if (po.status !== 'APPROVED') {
      throw new BusinessRuleError('Purchase order must be approved before sending');
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
    res.json(updated);
  })
);

router.post(
  '/:id/complete',
  authenticate,
  requirePermission('purchase_orders.approve'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      throw new NotFoundError('Purchase Order', id);
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CLOSED' },
    });
    res.json(updated);
  })
);

export default router;
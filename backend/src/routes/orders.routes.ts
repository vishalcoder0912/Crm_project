// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { generateBusinessId } from '../utils/idGenerator';
import {
  createAuditLog,
  createNotification,
  computeLineTotals,
  sumDocumentTotals,
  round2,
} from '../utils/helpers';
import { ORDER_STATUS_TRANSITIONS, ORDER_STATUS } from '../config/constants';

const router = Router();

const ORDER_INCLUDES = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  quotation: { select: { id: true, businessId: true } },
  site: true,
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  items: true,
  statusHistory: { orderBy: { createdAt: 'desc' as const } },
  payments: true,
  communications: true,
};

interface OrderItemInput {
  skuId: number;
  measurementId?: number;
  measurementItemId?: number;
  room?: string;
  quantity: number;
  rate?: number;
  serviceCharge?: number;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
}

async function resolveOrderItems(items: OrderItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('At least one item is required');
  }
  const skuIds = [...new Set(items.map((i) => Number(i.skuId)))];
  const skus = await prisma.sku.findMany({ where: { id: { in: skuIds } } });
  if (skus.length !== skuIds.length) {
    throw new ValidationError('One or more SKUs are invalid');
  }
  const skuMap = new Map(skus.map((s) => [s.id, s]));

  return items.map((item) => {
    const sku = skuMap.get(Number(item.skuId))!;
    const rate = Number(item.rate) || 0;
    const serviceCharge = Number(item.serviceCharge ?? sku.serviceCharge) || 0;
    const discountPercent = Number(item.discountPercent) || 0;
    const taxPercent = Number(item.taxPercent ?? sku.taxPercent) || 18;
    const quantity = Number(item.quantity) || 0;

    const pricing = computeLineTotals({ quantity, rate, serviceCharge, discountPercent, taxPercent });

    return {
      skuId: sku.id,
      measurementId: item.measurementId ?? null,
      measurementItemId: item.measurementItemId ?? null,
      room: item.room ?? null,
      productName: sku.name,
      quantity,
      rate,
      serviceCharge,
      discountPercent,
      discountAmount: pricing.discountAmount,
      taxPercent,
      taxAmount: pricing.taxAmount,
      amount: pricing.amount,
      status: 'PENDING',
      notes: item.notes ?? null,
    };
  });
}

async function recomputeOrderTotals(orderId: number) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const totals = sumDocumentTotals(
    items.map((i) => ({
      quantity: Number(i.quantity),
      rate: Number(i.rate),
      serviceCharge: Number(i.serviceCharge),
      discountPercent: Number(i.discountPercent),
      taxPercent: Number(i.taxPercent),
    }))
  );
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      balanceAmount: round2(totals.totalAmount - Number(order.advanceAmount)),
    },
  });
}

router.post(
  '/',
  authenticate,
  requirePermission('orders.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as any;

    const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
    if (!customer) {
      throw new ValidationError('customerId does not exist');
    }
    if (body.quotationId) {
      const quotation = await prisma.quotation.findUnique({ where: { id: Number(body.quotationId) } });
      if (!quotation) {
        throw new ValidationError('quotationId does not exist');
      }
    }

    const items = await resolveOrderItems(body.items);
    const totals = sumDocumentTotals(items);
    const advanceAmount = round2(Number(body.advanceAmount) || 0);
    const businessId = await generateBusinessId('order', 'orders');

    const order = await prisma.order.create({
      data: {
        businessId,
        customerId: Number(body.customerId),
        quotationId: body.quotationId ?? null,
        siteId: body.siteId ?? null,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        advanceAmount,
        balanceAmount: round2(totals.totalAmount - advanceAmount),
        status: body.status ?? 'CONFIRMED',
        paymentStatus: advanceAmount > 0 ? 'PARTIAL' : 'PENDING',
        createdById: req.user!.userId,
        notes: body.notes ?? null,
        items: { create: items },
      },
      include: ORDER_INCLUDES,
    });

    await createAuditLog(req, 'CREATE', 'order', order.id, undefined, { businessId });
    if (customer.assignedEmployeeId) {
      await createNotification(
        customer.assignedEmployeeId,
        'ORDER_CREATED',
        'Order Created',
        `Order ${businessId} created`
      );
    }
    res.status(201).json(order);
  })
);

router.get(
  '/',
  authenticate,
  requirePermission('orders.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const where: Record<string, unknown> = { deletedAt: null };
    for (const field of ['status', 'paymentStatus', 'deliveryStatus', 'customerId', 'quotationId']) {
      if (req.query[field]) {
        where[field] = field.endsWith('Id') ? Number(req.query[field]) : req.query[field];
      }
    }
    const q = (req.query.q as string)?.trim();
    if (q) {
      where.businessId = { contains: q, mode: 'insensitive' };
    }
    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDES,
    });
    res.json(orders);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('orders.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        ...ORDER_INCLUDES,
        items: {
          include: { sku: true, tailoringOrders: true, qcInspections: true, resizingRequests: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundError('Order', id);
    }
    res.json(order);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission('orders.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order', id);
    }

    const { advanceAmount, notes, siteId } = req.body as any;
    const data: Record<string, unknown> = {};

    if (advanceAmount !== undefined) {
      const advance = round2(Number(advanceAmount));
      data.advanceAmount = advance;
      data.balanceAmount = round2(Number(order.totalAmount) - advance);
    }
    if (notes !== undefined) data.notes = notes;
    if (siteId !== undefined) data.siteId = siteId ?? null;

    const updated = await prisma.order.update({ where: { id }, data, include: ORDER_INCLUDES });
    if (advanceAmount !== undefined) {
      await recalcPaymentStatus(id);
    }
    res.json(updated);
  })
);

async function recalcPaymentStatus(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const payments = await prisma.payment.findMany({
    where: { orderId, status: 'CONFIRMED' },
  });
  const confirmed = payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(order.totalAmount);
  const paymentStatus = confirmed >= total && total > 0 ? 'PAID' : confirmed > 0 ? 'PARTIAL' : 'PENDING';
  if (paymentStatus !== order.paymentStatus) {
    await prisma.order.update({ where: { id: orderId }, data: { paymentStatus } });
  }
}

router.post(
  '/:id/status',
  authenticate,
  requirePermission('orders.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { status, reason } = req.body as { status: string; reason?: string };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order', id);
    }

    if (!Object.values(ORDER_STATUS).includes(status as any)) {
      throw new ValidationError(`Invalid order status: ${status}`);
    }

    if (status !== order.status) {
      const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(status)) {
        throw new BusinessRuleError(`Cannot move order from ${order.status} to ${status}`);
      }

      const updated = await prisma.$transaction([
        prisma.order.update({ where: { id }, data: { status } }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: order.status,
            toStatus: status,
            changedById: req.user?.userId,
            reason: reason ?? null,
          },
        }),
      ]);

      await createAuditLog(req, 'STATUS_CHANGE', 'order', id, order.status, status);
      res.json(updated[0]);
      return;
    }

    res.json(order);
  })
);

router.get(
  '/:id/status-history',
  authenticate,
  requirePermission('orders.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(history);
  })
);

router.post(
  '/:id/items',
  authenticate,
  requirePermission('orders.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order', id);
    }
    if (order.status === 'CLOSED' || order.status === 'COMPLETED') {
      throw new BusinessRuleError(`Cannot add items to a ${order.status} order`);
    }

    const body = req.body as any;
    const item = (await resolveOrderItems(Array.isArray(body.items) ? body.items : [body]))[0];
    await prisma.orderItem.create({ data: { ...item, orderId: id } });
    await recomputeOrderTotals(id);

    const updated = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDES });
    res.status(201).json(updated);
  })
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('orders.delete'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundError('Order', id);
    }
    const updated = await prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true, deleted: updated });
  })
);

export default router;
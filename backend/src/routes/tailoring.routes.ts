// hello this is vishal project
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
    model: 'tailoringOrder',
    entity: 'Tailoring Order',
    prefixKey: 'tailoringOrder',
    tableName: 'tailoring_orders',
    searchFields: ['businessId'],
    filterFields: ['orderId', 'orderItemId', 'skuId', 'status', 'assignedToId'],
    orderBy: { createdAt: 'desc' },
    includes: {
      order: { select: { id: true, businessId: true } },
      orderItem: { select: { id: true, productName: true, status: true } },
      sku: { select: { id: true, sku: true, name: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      qcInspections: true,
    },
    permissions: {
      read: 'tailoring.read',
      create: 'tailoring.create',
      update: 'tailoring.update',
      remove: 'tailoring.update',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const orderItem = await prisma.orderItem.findUnique({ where: { id: Number(body.orderItemId) } });
      if (!orderItem) {
        throw new ValidationError('orderItemId does not exist');
      }
      const sku = await prisma.sku.findUnique({ where: { id: Number(body.skuId) } });
      if (!sku) {
        throw new ValidationError('skuId does not exist');
      }
      const order = await prisma.order.findUnique({ where: { id: Number(body.orderId) } });
      if (!order) {
        throw new ValidationError('orderId does not exist');
      }
      return {
        orderId: orderItem.orderId,
        orderItemId: orderItem.id,
        skuId: sku.id,
        fabric: body.fabric ?? null,
        quantity: body.quantity ?? orderItem.quantity,
        room: body.room ?? orderItem.room ?? null,
        requiredOutput: body.requiredOutput ?? null,
        measurements: body.measurements ?? null,
        assignedToId: body.assignedToId ?? null,
        status: 'PENDING',
        notes: body.notes ?? null,
      };
    },
  })
);

router.post(
  '/:id/assign',
  authenticate,
  requirePermission('tailoring.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { assignedToId } = req.body as { assignedToId: number };

    const tailoring = await prisma.tailoringOrder.findUnique({ where: { id }, include: { orderItem: true } });
    if (!tailoring) {
      throw new NotFoundError('Tailoring Order', id);
    }
    if (tailoring.status === 'COMPLETED' || tailoring.status === 'DISPATCHED') {
      throw new BusinessRuleError(`Cannot assign a ${tailoring.status} tailoring order`);
    }

    const user = await prisma.user.findUnique({ where: { id: Number(assignedToId) } });
    if (!user) {
      throw new ValidationError('assignedToId does not exist');
    }

    const updated = await prisma.$transaction([
      prisma.tailoringOrder.update({
        where: { id },
        data: { assignedToId: user.id, status: 'ASSIGNED' },
      }),
      prisma.orderItem.update({
        where: { id: tailoring.orderItemId },
        data: { status: 'TAILORING' },
      }),
    ]);

    await createNotification(
      user.id,
      'TAILORING_ASSIGNED',
      'Tailoring Assigned',
      `Tailoring order ${tailoring.businessId} assigned to you`
    );
    res.json(updated[0]);
  })
);

router.post(
  '/:id/start',
  authenticate,
  requirePermission('tailoring.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const tailoring = await prisma.tailoringOrder.findUnique({ where: { id } });
    if (!tailoring) {
      throw new NotFoundError('Tailoring Order', id);
    }
    if (tailoring.status !== 'ASSIGNED') {
      throw new BusinessRuleError('Tailoring order must be assigned before starting production');
    }
    const updated = await prisma.tailoringOrder.update({
      where: { id },
      data: { status: 'IN_PRODUCTION', startedAt: new Date() },
    });
    res.json(updated);
  })
);

router.post(
  '/:id/complete',
  authenticate,
  requirePermission('tailoring.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const tailoring = await prisma.tailoringOrder.findUnique({ where: { id } });
    if (!tailoring) {
      throw new NotFoundError('Tailoring Order', id);
    }
    if (tailoring.status === 'COMPLETED') {
      throw new BusinessRuleError('Tailoring order is already completed');
    }
    const updated = await prisma.$transaction([
      prisma.tailoringOrder.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      prisma.orderItem.update({
        where: { id: tailoring.orderItemId },
        data: { status: 'QC_PENDING' },
      }),
    ]);
    await createAuditLog(req, 'STATUS_CHANGE', 'tailoring_order', id, tailoring.status, 'COMPLETED');
    res.json(updated[0]);
  })
);

export default router;
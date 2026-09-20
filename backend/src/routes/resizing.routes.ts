// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog } from '../utils/helpers';

const router = Router();

const RESIZING_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['TAILORING', 'COMPLETED'],
  TAILORING: ['QC', 'COMPLETED'],
  QC: ['PACKED', 'COMPLETED'],
  PACKED: ['REINSTALLATION_SCHEDULED', 'COMPLETED'],
  REINSTALLATION_SCHEDULED: ['COMPLETED'],
  COMPLETED: [],
};

router.use(
  '/',
  createCrudRouter({
    model: 'resizingRequest',
    entity: 'Resizing Request',
    prefixKey: 'resizingRequest',
    tableName: 'resizing_requests',
    searchFields: ['businessId', 'reason'],
    filterFields: ['orderId', 'orderItemId', 'status'],
    orderBy: { createdAt: 'desc' },
    includes: {
      orderItem: {
        select: { id: true, productName: true, status: true, orderId: true },
      },
      measurementItem: true,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    permissions: {
      read: 'resizing.read',
      create: 'resizing.create',
      update: 'resizing.update',
      remove: 'resizing.update',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const orderItem = await prisma.orderItem.findUnique({ where: { id: Number(body.orderItemId) } });
      if (!orderItem) {
        throw new ValidationError('orderItemId does not exist');
      }
      if (!body.reason) {
        throw new ValidationError('reason is required');
      }
      return {
        orderId: body.orderId ?? orderItem.orderId,
        orderItemId: orderItem.id,
        measurementItemId: body.measurementItemId ?? null,
        originalWidth: body.originalWidth ?? null,
        originalHeight: body.originalHeight ?? null,
        requiredWidth: body.requiredWidth ?? null,
        requiredHeight: body.requiredHeight ?? null,
        reason: body.reason,
        reasonDetail: body.reasonDetail ?? null,
        status: 'CREATED',
        createdById: req.user!.userId,
      };
    },
  })
);

router.post(
  '/:id/status',
  authenticate,
  requirePermission('resizing.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body as { status: string };

    const resizing = await prisma.resizingRequest.findUnique({ where: { id } });
    if (!resizing) {
      throw new NotFoundError('Resizing Request', id);
    }

    const allowed = RESIZING_TRANSITIONS[resizing.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Cannot move resizing request from ${resizing.status} to ${status}`
      );
    }

    const updated = await prisma.$transaction([
      prisma.resizingRequest.update({ where: { id }, data: { status } }),
      ...(status === 'CREATED'
        ? [
            prisma.orderItem.update({
              where: { id: resizing.orderItemId },
              data: { status: 'RESIZING' },
            }),
          ]
        : status === 'COMPLETED'
        ? [
            prisma.orderItem.update({
              where: { id: resizing.orderItemId },
              data: { status: 'QC_PASSED' },
            }),
          ]
        : []),
    ]);

    await createAuditLog(req, 'STATUS_CHANGE', 'resizing_request', id, resizing.status, status);
    res.json(updated[0]);
  })
);

export default router;
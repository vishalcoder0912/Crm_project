// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog, createNotification } from '../utils/helpers';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'qcInspection',
    entity: 'QC Inspection',
    prefixKey: 'qcInspection',
    tableName: 'qc_inspections',
    searchFields: ['businessId'],
    filterFields: ['tailoringOrderId', 'orderItemId', 'result'],
    orderBy: { inspectedAt: 'desc' },
    includes: {
      tailoringOrder: { select: { id: true, businessId: true } },
      orderItem: { select: { id: true, productName: true, status: true } },
      inspectedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    permissions: {
      read: 'qc.read',
      create: 'qc.create',
      update: 'qc.read',
      remove: 'qc.read',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const orderItem = await prisma.orderItem.findUnique({ where: { id: Number(body.orderItemId) } });
      if (!orderItem) {
        throw new ValidationError('orderItemId does not exist');
      }

      if (!body.tailoringOrderId) {
        throw new ValidationError('tailoringOrderId is required');
      }
      const tailoring = await prisma.tailoringOrder.findUnique({
        where: { id: Number(body.tailoringOrderId) },
      });
      if (!tailoring) {
        throw new ValidationError('tailoringOrderId does not exist');
      }

      const result = body.result || (body.stitchingCorrect && body.finishingOk ? 'PASS' : 'FAIL');
      if (!['PASS', 'FAIL'].includes(result)) {
        throw new ValidationError('result must be PASS or FAIL');
      }

      return {
        tailoringOrderId: tailoring.id,
        orderItemId: orderItem.id,
        productCorrect: body.productCorrect ?? false,
        quantityCorrect: body.quantityCorrect ?? false,
        measurementCorrect: body.measurementCorrect ?? false,
        fabricCorrect: body.fabricCorrect ?? false,
        stitchingCorrect: body.stitchingCorrect ?? false,
        finishingOk: body.finishingOk ?? false,
        result,
        failReason: body.failReason ?? null,
        inspectedById: req.user!.userId,
        inspectedAt: body.inspectedAt ? new Date(body.inspectedAt) : new Date(),
        notes: body.notes ?? null,
      };
    },
  })
);

router.post(
  '/:id/apply',
  authenticate,
  requirePermission('qc.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const inspection = await prisma.qcInspection.findUnique({ where: { id } });
    if (!inspection) {
      throw new NotFoundError('QC Inspection', id);
    }

    if (inspection.orderItemId) {
      await prisma.orderItem.update({
        where: { id: inspection.orderItemId },
        data: { status: inspection.result === 'PASS' ? 'QC_PASSED' : 'QC_FAILED' },
      });
    }

    if (inspection.tailoringOrderId) {
      await prisma.tailoringOrder.update({
        where: { id: inspection.tailoringOrderId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    await createAuditLog(req, 'STATUS_CHANGE', 'qc_inspection', id, undefined, inspection.result);

    if (inspection.result === 'FAIL') {
      const orderItem = await prisma.orderItem.findUnique({ where: { id: inspection.orderItemId } });
      if (orderItem) {
        const order = await prisma.order.update({
          where: { id: orderItem.orderId },
          data: { status: 'QC_FAILED' },
        });
        const orderItems = await prisma.orderItem.findMany({ where: { orderId: orderItem.orderId }, select: { id: true } });
        const tailoringOrders = await prisma.tailoringOrder.findMany({
          where: { orderItemId: { in: orderItems.map((i) => i.id) }, assignedToId: { not: null } },
        });
        const tailoringUserIds = [...new Set(tailoringOrders.map((t) => t.assignedToId!))];
        for (const userId of tailoringUserIds) {
          await createNotification(
            userId,
            'QC_FAILED',
            'QC Failed',
            `Item ${orderItem.productName} failed QC on order ${order.businessId}`
          );
        }
      }
    } else if (inspection.result === 'PASS') {
      const orderItem = await prisma.orderItem.findUnique({ where: { id: inspection.orderItemId } });
      if (orderItem) {
        const order = await prisma.order.findUnique({ where: { id: orderItem.orderId } });
        const items = await prisma.orderItem.findMany({
          where: { orderId: orderItem.orderId },
          select: { status: true },
        });
        const allPassed = items.length > 0 && items.every((i) => i.status === 'QC_PASSED');
        if (order && allPassed && ['TAILORING', 'READY_FOR_QC'].includes(order.status)) {
          await prisma.order.update({ where: { id: order.id }, data: { status: 'QC_PASSED' } });
        }
      }
    }

    res.json({ success: true, inspection });
  })
);

export default router;
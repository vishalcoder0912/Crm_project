// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/errors';
import { generateBusinessId } from '../utils/idGenerator';
import { createAuditLog, createNotification, recalcOrderPaymentStatus } from '../utils/helpers';
import { PAYMENT_TYPE, PAYMENT_METHOD } from '../config/constants';

const router = Router();

const PAYMENT_INCLUDES = {
  customer: { select: { id: true, name: true, phone: true } },
  order: { select: { id: true, businessId: true, totalAmount: true, paymentStatus: true } },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
};

router.get(
  '/',
  authenticate,
  requirePermission('payments.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const where: Record<string, unknown> = {};
    for (const field of ['customerId', 'orderId', 'paymentType', 'paymentMethod', 'status']) {
      if (req.query[field]) {
        where[field] = field.endsWith('Id') ? Number(req.query[field]) : req.query[field];
      }
    }
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: PAYMENT_INCLUDES,
    });
    res.json(payments);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('payments.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const payment = await prisma.payment.findUnique({ where: { id }, include: PAYMENT_INCLUDES });
    if (!payment) {
      throw new NotFoundError('Payment', id);
    }
    res.json(payment);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('payments.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as any;

    if (!Object.values(PAYMENT_TYPE).includes(body.paymentType)) {
      throw new ValidationError(`paymentType must be one of: ${Object.values(PAYMENT_TYPE).join(', ')}`);
    }
    if (body.paymentMethod && !Object.values(PAYMENT_METHOD).includes(body.paymentMethod)) {
      throw new ValidationError(`Invalid paymentMethod`);
    }
    if (!body.amount || Number(body.amount) <= 0) {
      throw new ValidationError('amount must be greater than zero');
    }

    const order = await prisma.order.findUnique({ where: { id: Number(body.orderId) } });
    if (!order) {
      throw new ValidationError('orderId does not exist');
    }
    const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
    if (!customer) {
      throw new ValidationError('customerId does not exist');
    }

    const businessId = await generateBusinessId('payment', 'payments');

    const payment = await prisma.payment.create({
      data: {
        businessId,
        customerId: customer.id,
        orderId: order.id,
        paymentType: body.paymentType,
        amount: Number(body.amount),
        paymentMethod: body.paymentMethod ?? null,
        referenceNo: body.referenceNo ?? null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        status: body.status ?? 'PENDING',
        zohoReceiptId: body.zohoReceiptId ?? null,
        zohoSynced: body.zohoSynced ?? false,
        recordedById: req.user!.userId,
        notes: body.notes ?? null,
      },
      include: PAYMENT_INCLUDES,
    });

    await createAuditLog(req, 'CREATE', 'payment', payment.id, undefined, { businessId });
    res.status(201).json(payment);
  })
);

router.post(
  '/:id/confirm',
  authenticate,
  requirePermission('payments.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundError('Payment', id);
    }
    if (payment.status === 'CONFIRMED') {
      return res.json(payment);
    }
    if (payment.status === 'REFUNDED') {
      throw new ValidationError('A refunded payment cannot be confirmed');
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: PAYMENT_INCLUDES,
    });

    await recalcOrderPaymentStatus(payment.orderId);
    await createAuditLog(req, 'STATUS_CHANGE', 'payment', id, payment.status, 'CONFIRMED');

    const customer = await prisma.customer.findUnique({ where: { id: payment.customerId } });
    if (customer?.assignedEmployeeId) {
      await createNotification(
        customer.assignedEmployeeId,
        'PAYMENT_RECEIVED',
        'Payment Received',
        `Payment ${payment.businessId} of ${payment.amount} confirmed on order ${payment.orderId}`
      );
    }

    res.json(updated);
  })
);

router.post(
  '/:id/refund',
  authenticate,
  requirePermission('payments.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundError('Payment', id);
    }
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: 'REFUNDED', zohoSynced: false },
    });
    await recalcOrderPaymentStatus(payment.orderId);
    res.json(updated);
  })
);

export default router;
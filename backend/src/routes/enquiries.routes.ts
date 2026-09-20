import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createNotification, createAuditLog } from '../utils/helpers';
import { ENQUIRY_STATUS, LOST_REASONS } from '../config/constants';

const router = Router();

const ENQUIRY_TRANSITIONS: Record<string, string[]> = {
  [ENQUIRY_STATUS.NEW]: [
    ENQUIRY_STATUS.CONTACTED,
    ENQUIRY_STATUS.MEASUREMENT_PENDING,
    ENQUIRY_STATUS.LOST,
  ],
  [ENQUIRY_STATUS.CONTACTED]: [
    ENQUIRY_STATUS.MEASUREMENT_PENDING,
    ENQUIRY_STATUS.QUOTATION_PENDING,
    ENQUIRY_STATUS.LOST,
  ],
  [ENQUIRY_STATUS.MEASUREMENT_PENDING]: [ENQUIRY_STATUS.MEASURED, ENQUIRY_STATUS.LOST],
  [ENQUIRY_STATUS.MEASURED]: [ENQUIRY_STATUS.QUOTATION_PENDING, ENQUIRY_STATUS.LOST],
  [ENQUIRY_STATUS.QUOTATION_PENDING]: [ENQUIRY_STATUS.QUOTATION_SENT, ENQUIRY_STATUS.LOST],
  [ENQUIRY_STATUS.QUOTATION_SENT]: [
    ENQUIRY_STATUS.WON,
    ENQUIRY_STATUS.CONTACTED,
    ENQUIRY_STATUS.LOST,
  ],
};

router.use(
  '/',
  createCrudRouter({
    model: 'enquiry',
    entity: 'Enquiry',
    prefixKey: 'enquiry',
    tableName: 'enquiries',
    softDelete: true,
    searchFields: ['businessId'],
    filterFields: ['customerId', 'status', 'assignedToId', 'siteId'],
    orderBy: { createdAt: 'desc' },
    includes: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      site: true,
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      items: true,
    },
    permissions: {
      read: 'enquiries.read',
      create: 'enquiries.create',
      update: 'enquiries.update',
      remove: 'enquiries.delete',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const customerId = body.customerId === undefined || body.customerId === null || body.customerId === '' ? NaN : Number(body.customerId);
      if (Number.isNaN(customerId)) {
        throw new ValidationError('customerId is required and must be a number');
      }
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new ValidationError('customerId does not exist');
      }
      const items = Array.isArray(body.items) ? body.items : [];
      for (const item of items) {
        if (!item.room || !item.requirement) {
          throw new ValidationError('Each item requires room and requirement');
        }
      }
      const { items: _items, ...rest } = body;
      const toNumberOrUndefined = (v: any): number | undefined =>
        v === undefined || v === null || v === '' ? undefined : Number(v);
      return {
        ...rest,
        customerId,
        siteId: toNumberOrUndefined(rest.siteId),
        assignedToId: toNumberOrUndefined(rest.assignedToId),
        createdById: req.user!.userId,
        ...(items.length > 0 ? { items: { create: items } } : {}),
      };
    },
    updateBody: async (req, body) => {
      const { items, ...rest } = body;
      const data: Record<string, unknown> = { ...rest };
      const toNumberOrUndefined = (v: any): number | undefined =>
        v === undefined || v === null || v === '' ? undefined : Number(v);
      if (rest.customerId !== undefined) data.customerId = toNumberOrUndefined(rest.customerId);
      if (rest.siteId !== undefined) data.siteId = toNumberOrUndefined(rest.siteId);
      if (rest.assignedToId !== undefined) data.assignedToId = toNumberOrUndefined(rest.assignedToId);
      if (Array.isArray(items) && items.length > 0) {
        data.items = { create: items };
      }
      return data;
    },
  })
);

router.post(
  '/:id/status',
  authenticate,
  requirePermission('enquiries.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { status, lostReason, lostReasonDetail } = req.body as any;

    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    if (!enquiry) {
      throw new NotFoundError('Enquiry', id);
    }

    if (!Object.values(ENQUIRY_STATUS).includes(status)) {
      throw new ValidationError(`Invalid enquiry status: ${status}`);
    }

    if (status === ENQUIRY_STATUS.LOST) {
      if (!lostReason) {
        throw new ValidationError('lostReason is required when marking as LOST');
      }
      if (!LOST_REASONS.includes(lostReason)) {
        throw new ValidationError(`lostReason must be one of: ${LOST_REASONS.join(', ')}`);
      }
    }

    if (status !== enquiry.status) {
      const allowed = ENQUIRY_TRANSITIONS[enquiry.status] ?? [];
      if (!allowed.includes(status)) {
        throw new BusinessRuleError(`Cannot move enquiry from ${enquiry.status} to ${status}`);
      }

      const updated = await prisma.enquiry.update({
        where: { id },
        data: { status, lostReason: lostReason ?? null, lostReasonDetail: lostReasonDetail ?? null },
      });

      await createAuditLog(req, 'STATUS_CHANGE', 'enquiry', id, enquiry.status, status);

      if (status === ENQUIRY_STATUS.WON && enquiry.assignedToId) {
        await createNotification(
          enquiry.assignedToId,
          'ENQUIRY_WON',
          'Enquiry Won',
          `Enquiry ${enquiry.businessId} for ${enquiry.customerId ? '' : ''}customer was marked WON`
        );
      }

      res.json(updated);
      return;
    }

    res.json(enquiry);
  })
);

export default router;
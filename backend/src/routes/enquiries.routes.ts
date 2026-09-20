// hello this is vishal project
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
      const body = (req.body ?? {}) as Record<string, any>;

      const toIdOrThrow = (v: unknown, field: string): number | undefined => {
        if (v === undefined || v === null || v === '') return undefined;
        const n = Number(v);
        if (!Number.isInteger(n)) {
          throw new ValidationError(`${field} must be a valid number`);
        }
        return n;
      };

      const customerId = toIdOrThrow(body.customerId, 'customerId');
      if (customerId === undefined) {
        throw new ValidationError('customerId is required and must be a number');
      }
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        throw new ValidationError('customerId does not exist');
      }

      const items = Array.isArray(body.items) ? body.items : [];
      for (const item of items) {
        if (
          !(typeof item?.room === 'string' && item.room.trim()) ||
          !(typeof item?.requirement === 'string' && item.requirement.trim())
        ) {
          throw new ValidationError('Each item requires room and requirement');
        }
      }

      const status = body.status ?? ENQUIRY_STATUS.NEW;
      if (!Object.values(ENQUIRY_STATUS).includes(status)) {
        throw new ValidationError(`Invalid enquiry status: ${status}`);
      }
      if (status === ENQUIRY_STATUS.LOST) {
        if (!body.lostReason || !LOST_REASONS.includes(body.lostReason)) {
          throw new ValidationError(`lostReason must be one of: ${LOST_REASONS.join(', ')}`);
        }
      }

      const { items: _items, customerId: _c, status: _s, ...rest } = body;
      return {
        ...rest,
        customerId,
        siteId: toIdOrThrow(rest.siteId, 'siteId'),
        assignedToId: toIdOrThrow(rest.assignedToId, 'assignedToId'),
        status,
        createdById: req.user!.userId,
        ...(items.length > 0 ? { items: { create: items } } : {}),
      };
    },
    updateBody: async (_req, body) => {
      const writable = [
        'customerId',
        'siteId',
        'assignedToId',
        'source',
        'notes',
        'advanceAmount',
        'enquiryDate',
        'status',
        'lostReason',
        'lostReasonDetail',
        'items',
      ];
      const immutable = ['id', 'businessId', 'createdById', 'createdAt', 'updatedAt', 'deletedAt'];

      const data: Record<string, unknown> = {};
      for (const key of Object.keys(body ?? {})) {
        if (immutable.includes(key)) continue;
        if (!writable.includes(key)) {
          throw new ValidationError(`Unknown field for update: ${key}`);
        }
        const val = (body as Record<string, any>)[key];

        if (key === 'customerId' || key === 'siteId' || key === 'assignedToId') {
          if (val === undefined || val === null || val === '') {
            data[key] = null;
            continue;
          }
          const n = Number(val);
          if (!Number.isInteger(n)) {
            throw new ValidationError(`${key} must be a valid number`);
          }
          data[key] = n;
        } else if (key === 'status') {
          if (!Object.values(ENQUIRY_STATUS).includes(val)) {
            throw new ValidationError(`Invalid enquiry status: ${val}`);
          }
          data[key] = val;
        } else if (key === 'advanceAmount') {
          data[key] = val === undefined || val === null || val === '' ? null : Number(val);
        } else if (key === 'enquiryDate') {
          if (typeof val !== 'string' && !(val instanceof Date)) {
            throw new ValidationError('enquiryDate must be a valid date');
          }
          data[key] = new Date(val);
        } else if (key === 'items') {
          if (Array.isArray(val) && val.length > 0) {
            for (const item of val) {
              if (
                !(typeof item?.room === 'string' && item.room.trim()) ||
                !(typeof item?.requirement === 'string' && item.requirement.trim())
              ) {
                throw new ValidationError('Each item requires room and requirement');
              }
            }
            data.items = { create: val };
          }
        } else {
          data[key] = val;
        }
      }

      if (Object.keys(data).length === 0) {
        throw new ValidationError('Nothing to update');
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
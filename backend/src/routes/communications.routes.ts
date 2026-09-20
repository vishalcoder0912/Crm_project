// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { createCrudRouter } from '../utils/crud';
import { ValidationError } from '../utils/errors';
import type { AuthRequest } from '../middleware/auth';

const COMMUNICATION_TYPES = ['WHATSAPP', 'EMAIL', 'SMS', 'CALL', 'NOTE'];
const DIRECTIONS = ['INBOUND', 'OUTBOUND'];
const DELIVERY_STATUSES = ['SENT', 'DELIVERED', 'READ', 'FAILED'];

function toIdOrThrow(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n)) {
    throw new ValidationError(`${field} must be a valid number`);
  }
  return n;
}

const createBody = async (
  req: AuthRequest,
  _body?: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const body = (req.body ?? {}) as Record<string, any>;

  const customerId = toIdOrThrow(body.customerId, 'customerId');
  if (customerId === undefined) {
    throw new ValidationError('customerId is required and must be a number');
  }
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new ValidationError('customerId does not exist');
  }

  const orderId = toIdOrThrow(body.orderId, 'orderId');
  if (orderId !== undefined) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new ValidationError('orderId does not exist');
    }
  }

  if (!(typeof body.message === 'string' && body.message.trim())) {
    throw new ValidationError('message is required');
  }

  const type = body.type ?? 'NOTE';
  if (!COMMUNICATION_TYPES.includes(type)) {
    throw new ValidationError(`type must be one of: ${COMMUNICATION_TYPES.join(', ')}`);
  }
  const direction = body.direction ?? 'OUTBOUND';
  if (!DIRECTIONS.includes(direction)) {
    throw new ValidationError(`direction must be one of: ${DIRECTIONS.join(', ')}`);
  }
  const deliveryStatus = body.deliveryStatus ?? null;
  if (deliveryStatus && !DELIVERY_STATUSES.includes(deliveryStatus)) {
    throw new ValidationError(
      `deliveryStatus must be one of: ${DELIVERY_STATUSES.join(', ')}`
    );
  }

  return {
    customerId,
    orderId: orderId ?? null,
    type,
    direction,
    subject: body.subject ?? null,
    message: body.message,
    attachmentUrl: body.attachmentUrl ?? null,
    senderId: req.user?.userId ?? null,
    recipientPhone: body.recipientPhone ?? customer.phone ?? null,
    recipientEmail: body.recipientEmail ?? customer.email ?? null,
    deliveryStatus,
    relatedEntity: body.relatedEntity ?? null,
    relatedEntityId: body.relatedEntityId ?? null,
  };
};

const updateBody = async (
  _req: AuthRequest,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const known = [
    'customerId',
    'orderId',
    'type',
    'direction',
    'subject',
    'message',
    'attachmentUrl',
    'recipientPhone',
    'recipientEmail',
    'deliveryStatus',
    'relatedEntity',
    'relatedEntityId',
  ];
  const immutable = ['id', 'createdAt', 'senderId'];

  const data: Record<string, unknown> = {};
  for (const key of Object.keys(body ?? {})) {
    if (immutable.includes(key)) continue;
    if (!known.includes(key)) {
      throw new ValidationError(`Unknown field for update: ${key}`);
    }
    const val = (body as Record<string, any>)[key];

    if (key === 'customerId' || key === 'orderId' || key === 'relatedEntityId') {
      if (val === undefined || val === null || val === '') {
        data[key] = null;
        continue;
      }
      const n = Number(val);
      if (!Number.isInteger(n)) {
        throw new ValidationError(`${key} must be a valid number`);
      }
      data[key] = n;
    } else if (key === 'type') {
      if (!COMMUNICATION_TYPES.includes(val)) {
        throw new ValidationError(`type must be one of: ${COMMUNICATION_TYPES.join(', ')}`);
      }
      data[key] = val;
    } else if (key === 'direction') {
      if (!DIRECTIONS.includes(val)) {
        throw new ValidationError(`direction must be one of: ${DIRECTIONS.join(', ')}`);
      }
      data[key] = val;
    } else if (key === 'deliveryStatus') {
      if (val !== null && val !== undefined && val !== '' && !DELIVERY_STATUSES.includes(val)) {
        throw new ValidationError(
          `deliveryStatus must be one of: ${DELIVERY_STATUSES.join(', ')}`
        );
      }
      data[key] = val === '' ? null : val;
    } else if (key === 'message') {
      if (!(typeof val === 'string' && val.trim())) {
        throw new ValidationError('message cannot be empty');
      }
      data[key] = val;
    } else if (key === 'subject') {
      data[key] = typeof val === 'string' && val.trim() ? val.trim() : null;
    } else {
      data[key] = val;
    }
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError('Nothing to update');
  }
  return data;
};

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'communication',
    entity: 'Communication',
    searchFields: ['subject', 'message', 'recipientPhone', 'recipientEmail'],
    filterFields: ['customerId', 'orderId', 'type', 'direction'],
    orderBy: { createdAt: 'desc' },
    includes: {
      customer: { select: { id: true, name: true, phone: true } },
      order: { select: { id: true, businessId: true } },
      sender: { select: { id: true, firstName: true, lastName: true } },
    },
    permissions: {
      read: 'communications.read',
      create: 'communications.create',
      update: 'communications.create',
      remove: 'communications.create',
    },
    createBody,
    updateBody,
  })
);

export default router;
import { Router } from 'express';
import prisma from '../config/database';
import { createCrudRouter } from '../utils/crud';
import { ValidationError } from '../utils/errors';

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
    createBody: async (req) => {
      const body = req.body as any;
      const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
      if (!customer) {
        throw new ValidationError('customerId does not exist');
      }
      if (body.orderId) {
        const order = await prisma.order.findUnique({ where: { id: Number(body.orderId) } });
        if (!order) {
          throw new ValidationError('orderId does not exist');
        }
      }
      if (!body.message) {
        throw new ValidationError('message is required');
      }
      return {
        customerId: customer.id,
        orderId: body.orderId ?? null,
        type: body.type ?? 'NOTE',
        direction: body.direction ?? 'OUTBOUND',
        subject: body.subject ?? null,
        message: body.message,
        attachmentUrl: body.attachmentUrl ?? null,
        senderId: req.user?.userId ?? null,
        recipientPhone: body.recipientPhone ?? customer.phone ?? null,
        recipientEmail: body.recipientEmail ?? customer.email ?? null,
        deliveryStatus: body.deliveryStatus ?? null,
        relatedEntity: body.relatedEntity ?? null,
        relatedEntityId: body.relatedEntityId ?? null,
      };
    },
  })
);

export default router;
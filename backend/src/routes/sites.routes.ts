// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { createCrudRouter } from '../utils/crud';
import { ValidationError } from '../utils/errors';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'site',
    entity: 'Site',
    filterFields: ['customerId'],
    orderBy: { createdAt: 'desc' },
    includes: { customer: { select: { id: true, name: true, phone: true } } },
    permissions: {
      read: 'customers.read',
      create: 'customers.create',
      update: 'customers.update',
      remove: 'customers.delete',
    },
    createBody: async (req) => {
      const body = req.body as Record<string, unknown>;
      if (!body.customerId) {
        throw new ValidationError('customerId is required');
      }
      const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
      if (!customer) {
        throw new ValidationError('customerId does not exist');
      }
      return body;
    },
  })
);

export default router;
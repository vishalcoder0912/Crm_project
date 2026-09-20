import { Router } from 'express';
import { createCrudRouter } from '../utils/crud';

const router = Router();

const CUSTOMER_FIELDS = ['name', 'phone', 'email', 'address', 'notes', 'assignedEmployeeId'];

function pickFields(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of CUSTOMER_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

router.use(
  '/',
  createCrudRouter({
    model: 'customer',
    entity: 'Customer',
    prefixKey: 'customer',
    tableName: 'customers',
    softDelete: true,
    searchFields: ['businessId', 'name', 'phone', 'email'],
    filterFields: ['assignedEmployeeId'],
    createBody: async (_req, body) => pickFields(body),
    updateBody: async (_req, body) => pickFields(body),
    orderBy: { createdAt: 'desc' },
    includes: {
      sites: true,
      assignedEmployee: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    permissions: {
      read: 'customers.read',
      create: 'customers.create',
      update: 'customers.update',
      remove: 'customers.delete',
    },
  })
);

export default router;
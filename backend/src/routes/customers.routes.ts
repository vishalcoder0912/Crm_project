// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { createCrudRouter } from '../utils/crud';
import { ValidationError } from '../utils/errors';

const router = Router();

const CUSTOMER_FIELDS = ['name', 'phone', 'email', 'address', 'notes', 'assignedEmployeeId'];

function pickFields(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of CUSTOMER_FIELDS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

function requireText(data: Record<string, unknown>, field: string): void {
  const v = data[field];
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new ValidationError(`${field} is required`);
  }
}

function optionalText(data: Record<string, unknown>, field: string): void {
  if (data[field] !== undefined && String(data[field]).trim() === '') {
    throw new ValidationError(`${field} cannot be empty`);
  }
}

async function resolveEmployeeId(value: unknown): Promise<number | null> {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ValidationError('assignedEmployeeId must be a valid number');
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ValidationError(`assignedEmployeeId ${id} does not exist`);
  }
  return id;
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
    createBody: async (_req, body) => {
      const data = pickFields(body);
      requireText(data, 'name');
      optionalText(data, 'phone');
      optionalText(data, 'email');
      if (data.assignedEmployeeId !== undefined) {
        const id = await resolveEmployeeId(data.assignedEmployeeId);
        if (id !== null) data.assignedEmployeeId = id;
        else delete data.assignedEmployeeId;
      }
      return data;
    },
    updateBody: async (_req, body) => {
      const data = pickFields(body);
      if (Object.keys(data).length === 0) {
        throw new ValidationError('No valid fields to update');
      }
      optionalText(data, 'name');
      optionalText(data, 'phone');
      optionalText(data, 'email');
      if (data.assignedEmployeeId !== undefined) {
        const id = await resolveEmployeeId(data.assignedEmployeeId);
        if (id !== null) data.assignedEmployeeId = id;
        else delete data.assignedEmployeeId;
      }
      return data;
    },
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
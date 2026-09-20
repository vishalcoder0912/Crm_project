// hello this is vishal project
import { Router } from 'express';
import { createCrudRouter } from '../utils/crud';
import prisma from '../config/database';
import { ValidationError } from '../utils/errors';
import type { AuthRequest } from '../middleware/auth';

const createBody = async (
  _req: AuthRequest,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!name) {
    throw new ValidationError('Branch name is required');
  }
  if (!code) {
    throw new ValidationError('Branch code is required');
  }
  const city = typeof body.city === 'string' && body.city.trim() ? body.city.trim() : null;
  const isActive =
    body.isActive === undefined ? true : body.isActive === true || body.isActive === 'true';
  return { name, code, city, isActive };
};

const updateBody = async (
  _req: AuthRequest,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const keys = Object.keys(body ?? {});
  if (keys.length === 0) {
    throw new ValidationError('Nothing to update');
  }
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    const val = body[key];
    if (key === 'name') {
      const name = typeof val === 'string' ? val.trim() : '';
      if (!name) {
        throw new ValidationError('Branch name cannot be empty');
      }
      data.name = name;
    } else if (key === 'code') {
      const code = typeof val === 'string' ? val.trim().toUpperCase() : '';
      if (!code) {
        throw new ValidationError('Branch code cannot be empty');
      }
      data.code = code;
    } else if (key === 'city') {
      data.city = typeof val === 'string' && val.trim() ? val.trim() : null;
    } else if (key === 'isActive') {
      data.isActive = val === true || val === 'true' || val === 1 || val === '1';
    } else if (key === 'businessId') {
      // businessId is immutable
    } else {
      throw new ValidationError(`Unknown field for update: ${key}`);
    }
  }
  return data;
};

const beforeRemove = async (_req: AuthRequest, id: number): Promise<void> => {
  const counts = await prisma.branch.findUnique({
    where: { id },
    select: { _count: { select: { customers: true, users: true, followUps: true } } },
  });
  if (counts && counts._count.customers + counts._count.users + counts._count.followUps > 0) {
    throw new ValidationError(
      'Cannot delete a branch that still has customers, users, or follow-ups. Reassign them first.'
    );
  }
};

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'branch',
    entity: 'Branch',
    prefixKey: 'branch',
    tableName: 'branches',
    searchFields: ['name', 'code', 'city', 'businessId'],
    filterFields: ['isActive', 'city'],
    orderBy: { name: 'asc' },
    includes: {
      _count: { select: { customers: true, users: true, followUps: true } },
    },
    createBody,
    updateBody,
    beforeRemove,
    permissions: {
      read: 'branches.read',
      create: 'branches.create',
      update: 'branches.update',
      remove: 'branches.delete',
    },
  })
);

export default router;
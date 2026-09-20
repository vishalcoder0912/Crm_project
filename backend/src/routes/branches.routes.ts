import { Router } from 'express';
import { createCrudRouter } from '../utils/crud';

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
    permissions: {
      read: 'branches.read',
      create: 'branches.create',
      update: 'branches.update',
      remove: 'branches.delete',
    },
  })
);

export default router;

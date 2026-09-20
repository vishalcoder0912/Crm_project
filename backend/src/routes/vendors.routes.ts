import { Router } from 'express';
import { createCrudRouter } from '../utils/crud';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'vendor',
    entity: 'Vendor',
    prefixKey: 'vendor',
    tableName: 'vendors',
    softDelete: true,
    searchFields: ['businessId', 'name', 'contactPerson', 'phone', 'email', 'gstNumber'],
    filterFields: ['isActive'],
    orderBy: { name: 'asc' },
    includes: { _count: { select: { purchaseOrders: true, goodsReceipts: true } } },
    permissions: {
      read: 'vendors.read',
      create: 'vendors.create',
      update: 'vendors.update',
      remove: 'vendors.delete',
    },
  })
);

export default router;
// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { createCrudRouter } from '../utils/crud';
import { ValidationError } from '../utils/errors';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'measurement',
    entity: 'Measurement',
    prefixKey: 'measurement',
    tableName: 'measurements',
    searchFields: ['businessId'],
    filterFields: ['customerId', 'enquiryId', 'siteId', 'status', 'measuredById'],
    orderBy: { measurementDate: 'desc' },
    includes: {
      customer: { select: { id: true, name: true, phone: true } },
      enquiry: { select: { id: true, businessId: true } },
      site: true,
      measuredBy: { select: { id: true, firstName: true, lastName: true } },
      items: true,
    },
    permissions: {
      read: 'measurements.read',
      create: 'measurements.create',
      update: 'measurements.update',
      remove: 'measurements.delete',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
      if (!customer) {
        throw new ValidationError('customerId does not exist');
      }
      const items = Array.isArray(body.items) ? body.items : [];
      for (const item of items) {
        if (!item.room || !item.width || !item.height) {
          throw new ValidationError('Each measurement item requires room, width and height');
        }
      }
      const { items: _items, ...rest } = body;
      return {
        ...rest,
        measuredById: body.measuredById ?? req.user!.userId,
        ...(items.length > 0 ? { items: { create: items } } : {}),
      };
    },
  })
);

export default router;
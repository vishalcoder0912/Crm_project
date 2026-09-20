// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { createCrudRouter } from '../utils/crud';
import { ValidationError } from '../utils/errors';

const router = Router();

router.use(
  '/',
  createCrudRouter({
    model: 'measurementItem',
    entity: 'Measurement Item',
    filterFields: ['measurementId'],
    orderBy: { createdAt: 'asc' },
    includes: { measurement: { select: { id: true, businessId: true } } },
    permissions: {
      read: 'measurements.read',
      create: 'measurements.create',
      update: 'measurements.update',
      remove: 'measurements.delete',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const measurement = await prisma.measurement.findUnique({
        where: { id: Number(body.measurementId) },
      });
      if (!measurement) {
        throw new ValidationError('measurementId does not exist');
      }
      if (!body.room || !body.width || !body.height) {
        throw new ValidationError('room, width and height are required');
      }
      return body;
    },
  })
);

export default router;
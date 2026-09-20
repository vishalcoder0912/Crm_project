// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createNotification, createAuditLog } from '../utils/helpers';

const router = Router();

const SCHEDULE_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

router.use(
  '/',
  createCrudRouter({
    model: 'measurementSchedule',
    entity: 'Measurement Schedule',
    filterFields: ['enquiryId', 'assignedToId', 'status'],
    orderBy: { scheduledDate: 'asc' },
    includes: {
      enquiry: { select: { id: true, businessId: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
    },
    permissions: {
      read: 'measurements.read',
      create: 'measurements.create',
      update: 'measurements.update',
      remove: 'measurements.delete',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const enquiry = await prisma.enquiry.findUnique({
        where: { id: Number(body.enquiryId) },
        include: { customer: true, site: true },
      });
      if (!enquiry) {
        throw new ValidationError('enquiryId does not exist');
      }
      if (!body.scheduledDate) {
        throw new ValidationError('scheduledDate is required');
      }
      const filled = { ...body };
      if (!filled.customerName) filled.customerName = enquiry.customer.name;
      if (!filled.siteAddress) filled.siteAddress = enquiry.site?.address ?? enquiry.customer.address ?? '';
      if (!filled.phone) filled.phone = enquiry.customer.phone ?? undefined;
      return filled;
    },
  })
);

router.post(
  '/:id/status',
  authenticate,
  requirePermission('measurements.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body as { status: string };

    const schedule = await prisma.measurementSchedule.findUnique({ where: { id } });
    if (!schedule) {
      throw new NotFoundError('Measurement Schedule', id);
    }

    const allowed = SCHEDULE_TRANSITIONS[schedule.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Cannot move measurement schedule from ${schedule.status} to ${status}`
      );
    }

    const updated = await prisma.measurementSchedule.update({
      where: { id },
      data: { status, completedAt: status === 'COMPLETED' ? new Date() : schedule.completedAt },
    });

    await createAuditLog(req, 'STATUS_CHANGE', 'measurement_schedule', id, schedule.status, status);

    if (status === 'COMPLETED' && updated.assignedToId) {
      await createNotification(
        updated.assignedToId,
        'MEASUREMENT_COMPLETED',
        'Measurement Completed',
        `Measurement for enquiry ${schedule.enquiryId} completed`
      );
    }

    res.json(updated);
  })
);

export default router;
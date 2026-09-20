// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog, recalcOrderDeliveryStatus } from '../utils/helpers';

const router = Router();

const INSTALLATION_INCLUDES = {
  customer: { select: { id: true, name: true, phone: true } },
  order: { select: { id: true, businessId: true } },
  site: true,
  vehicle: true,
  fieldEmployees: { include: { fieldEmployee: true } },
  tracking: true,
};

router.use(
  '/',
  createCrudRouter({
    model: 'installation',
    entity: 'Installation',
    prefixKey: 'installation',
    tableName: 'installations',
    searchFields: ['businessId'],
    filterFields: ['customerId', 'orderId', 'siteId', 'vehicleId', 'status'],
    orderBy: { scheduledDate: 'asc' },
    includes: INSTALLATION_INCLUDES,
    permissions: {
      read: 'installations.read',
      create: 'installations.create',
      update: 'installations.update',
      remove: 'installations.update',
    },
    createBody: async (req) => {
      const body = req.body as any;
      const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
      if (!customer) {
        throw new ValidationError('customerId does not exist');
      }
      const order = await prisma.order.findUnique({ where: { id: Number(body.orderId) } });
      if (!order) {
        throw new ValidationError('orderId does not exist');
      }
      if (!body.scheduledDate) {
        throw new ValidationError('scheduledDate is required');
      }
      return {
        customerId: customer.id,
        orderId: order.id,
        siteId: body.siteId ?? order.siteId ?? null,
        scheduledDate: new Date(body.scheduledDate),
        scheduledTime: body.scheduledTime ?? null,
        vehicleId: body.vehicleId ?? null,
        status: 'SCHEDULED',
        notes: body.notes ?? null,
      };
    },
  })
);

router.post(
  '/:id/employees',
  authenticate,
  requirePermission('installations.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { fieldEmployeeId } = req.body as { fieldEmployeeId: number };

    const installation = await prisma.installation.findUnique({ where: { id } });
    if (!installation) {
      throw new NotFoundError('Installation', id);
    }
    const employee = await prisma.fieldEmployee.findUnique({ where: { id: Number(fieldEmployeeId) } });
    if (!employee) {
      throw new ValidationError('fieldEmployeeId does not exist');
    }

    const link = await prisma.installationEmployee.upsert({
      where: {
        installationId_fieldEmployeeId: {
          installationId: id,
          fieldEmployeeId: employee.id,
        },
      },
      update: {},
      create: { installationId: id, fieldEmployeeId: employee.id },
      include: { fieldEmployee: true },
    });
    res.status(201).json(link);
  })
);

router.post(
  '/:id/assign',
  authenticate,
  requirePermission('installations.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { vehicleId, status, scheduledDate } = req.body as {
      vehicleId?: number;
      status?: string;
      scheduledDate?: string;
    };

    const installation = await prisma.installation.findUnique({ where: { id } });
    if (!installation) {
      throw new NotFoundError('Installation', id);
    }

    const data: Record<string, unknown> = {};
    if (vehicleId !== undefined) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
      if (!vehicle) {
        throw new ValidationError('vehicleId does not exist');
      }
      data.vehicleId = vehicle.id;
    }
    if (status) data.status = status;
    if (scheduledDate) data.scheduledDate = new Date(scheduledDate);

    const updated = await prisma.installation.update({
      where: { id },
      data,
      include: INSTALLATION_INCLUDES,
    });
    res.json(updated);
  })
);

router.post(
  '/:id/start',
  authenticate,
  requirePermission('installations.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const installation = await prisma.installation.findUnique({ where: { id } });
    if (!installation) {
      throw new NotFoundError('Installation', id);
    }
    if (installation.status === 'COMPLETED' || installation.status === 'CANCELLED') {
      throw new BusinessRuleError(`Cannot start a ${installation.status} installation`);
    }
    const updated = await prisma.installation.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });
    res.json(updated);
  })
);

router.post(
  '/:id/complete',
  authenticate,
  requirePermission('installations.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const installation = await prisma.installation.findUnique({ where: { id } });
    if (!installation) {
      throw new NotFoundError('Installation', id);
    }
    if (installation.status === 'COMPLETED') {
      throw new BusinessRuleError('Installation is already completed');
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderItem.updateMany({
        where: { orderId: installation.orderId, status: 'PACKED' },
        data: { status: 'INSTALLED' },
      });
      return tx.installation.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    await recalcOrderDeliveryStatus(installation.orderId);
    await createAuditLog(req, 'STATUS_CHANGE', 'installation', id, installation.status, 'COMPLETED');
    res.json(updated);
  })
);

export default router;
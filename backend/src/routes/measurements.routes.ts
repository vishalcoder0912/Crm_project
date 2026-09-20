// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { createCrudRouter } from '../utils/crud';
import { ValidationError } from '../utils/errors';
import { buildEstimate, renderEstimateHtml, renderBlankMeasurementSheetHtml } from '../services/measurementEstimator';

const router = Router();

// =============================================================================
// Data-quality "gaps" helper
// -----------------------------------------------------------------------------
// Case 1 — customer gave details but we never measured (details without measurement)
// Case 2 — a measurement exists but the customer record is missing details (measurement without details)
// =============================================================================
router.get(
  '/gaps',
  authenticate,
  requirePermission('measurements.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const q = ((req.query.q as string) ?? '').trim();
    const nameContains = q ? { contains: q, mode: 'insensitive' as const } : undefined;

    const [customers, pendingEnquiries, incomplete] = await Promise.all([
      prisma.customer.findMany({
        where: {
          deletedAt: null,
          ...(nameContains
            ? { OR: [{ name: nameContains }, { phone: nameContains }, { email: nameContains }] }
            : {}),
        },
        select: {
          id: true,
          businessId: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          createdAt: true,
          branch: { select: { name: true } },
          _count: { select: { measurements: true, enquiries: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.enquiry.findMany({
        where: { deletedAt: null, status: 'MEASUREMENT_PENDING' },
        select: {
          id: true,
          businessId: true,
          status: true,
          createdAt: true,
          source: true,
          customer: { select: { id: true, name: true, phone: true, address: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      }),
      prisma.measurement.findMany({
        where: {
          customer: {
            OR: [{ phone: '' }, { address: null }, { address: '' }],
          },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true, notes: true } },
          items: true,
          measuredBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { measurementDate: 'desc' },
        take: 100,
      }),
    ]);

    const missingMeasurement = customers
      .filter((c) => c._count.measurements === 0)
      .map((c) => ({
        id: c.id,
        type: 'CUSTOMER' as const,
        businessId: c.businessId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        branch: c.branch?.name ?? null,
        createdAt: c.createdAt,
        label: 'Details on record, no measurement taken yet',
        actionLabel: 'Add measurement',
      }));

    const pendingMeasurement = pendingEnquiries.map((e) => ({
      id: e.id,
      type: 'ENQUIRY' as const,
      businessId: e.businessId,
      customerId: e.customer?.id ?? null,
      name: e.customer?.name ?? 'Unknown customer',
      phone: e.customer?.phone ?? null,
      address: e.customer?.address ?? null,
      branch: null,
      createdAt: e.createdAt,
      label: `Enquiry in "${e.status}" — measurement promised but not recorded`,
      actionLabel: 'Record measurement',
    }));

    const incompleteDetails = incomplete.map((m) => {
      const c = m.customer;
      const missing: string[] = [];
      if (!c.phone || c.phone.trim() === '') missing.push('phone');
      if (!c.address || c.address.trim() === '') missing.push('address');
      return {
        id: m.id,
        type: 'MEASUREMENT' as const,
        businessId: m.businessId,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        branch: null,
        createdAt: m.measurementDate,
        items: m.items.length,
        measuredBy: m.measuredBy ? `${m.measuredBy.firstName} ${m.measuredBy.lastName}` : null,
        missing,
        label: `Measurement recorded but customer ${missing.join(' & ')} missing`,
        actionLabel: 'Complete details',
      };
    });

    res.json({
      query: q,
      counts: {
        missingMeasurement: missingMeasurement.length,
        pendingMeasurement: pendingMeasurement.length,
        incompleteDetails: incompleteDetails.length,
        total: missingMeasurement.length + pendingMeasurement.length + incompleteDetails.length,
      },
      gaps: {
        missingMeasurement: missingMeasurement.slice(0, 50),
        pendingMeasurement: pendingMeasurement.slice(0, 50),
        incompleteDetails: incompleteDetails.slice(0, 50),
      },
    });
  })
);

// =============================================================================
// Blank sample measurement sheet for field technicians
// =============================================================================
router.get(
  '/blank-sheet',
  authenticate,
  requirePermission('measurements.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const html = renderBlankMeasurementSheetHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Aradhana-Furnishing-Blank-Measurement-Sheet.html"');
    res.send(html);
  })
);

// =============================================================================
// Schedule measurement visit (Case 1: customer details given, no measurement)
// =============================================================================
router.post(
  '/schedule-visit',
  authenticate,
  requirePermission('measurements.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const { customerId, enquiryId, scheduledDate, scheduledTime, assignedToId, siteAddress, phone, customerName, notes } = req.body ?? {};
    
    let resolvedCustomer: any = null;
    if (customerId) {
      resolvedCustomer = await prisma.customer.findUnique({ where: { id: Number(customerId) } });
    }

    let finalEnquiryId = enquiryId ? Number(enquiryId) : null;
    if (!finalEnquiryId && resolvedCustomer) {
      // Find latest enquiry or create a placeholder enquiry
      const existing = await prisma.enquiry.findFirst({
        where: { customerId: resolvedCustomer.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        finalEnquiryId = existing.id;
      } else {
        const count = await prisma.enquiry.count();
        const createdEnq = await prisma.enquiry.create({
          data: {
            businessId: `ENQ-${String(count + 1).padStart(4, '0')}`,
            customerId: resolvedCustomer.id,
            status: 'MEASUREMENT_PENDING',
            source: 'Measurement Visit Request',
            notes: notes ?? 'Scheduled doorstep measurement',
            createdById: req.user!.userId,
          },
        });
        finalEnquiryId = createdEnq.id;
      }
    }

    if (!finalEnquiryId) {
      throw new ValidationError('Either customerId or enquiryId is required to schedule a measurement visit');
    }

    const schedule = await prisma.measurementSchedule.create({
      data: {
        enquiryId: finalEnquiryId,
        scheduledDate: new Date(scheduledDate || new Date()),
        scheduledTime: scheduledTime ?? '11:00 AM',
        customerName: customerName || resolvedCustomer?.name || 'Customer',
        siteAddress: siteAddress || resolvedCustomer?.address || 'Site Address',
        phone: phone || resolvedCustomer?.phone || '',
        status: 'SCHEDULED',
        notes: notes ?? undefined,
        assignedToId: assignedToId ? Number(assignedToId) : req.user!.userId,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        enquiry: { include: { customer: true } },
      },
    });

    // Also create follow up on calendar
    if (resolvedCustomer) {
      const fupCount = await prisma.followUp.count();
      await prisma.followUp.create({
        data: {
          businessId: `FUP-${String(fupCount + 1).padStart(4, '0')}`,
          customerId: resolvedCustomer.id,
          enquiryId: finalEnquiryId,
          purpose: `Doorstep Measurement Visit · ${customerName || resolvedCustomer.name}`,
          channel: 'VISIT',
          dueAt: new Date(scheduledDate || new Date()),
          priority: 'HIGH',
          status: 'PENDING',
          assignedToId: assignedToId ? Number(assignedToId) : req.user!.userId,
          createdById: req.user!.userId,
          notes: `Site: ${siteAddress || resolvedCustomer.address || ''}. Time: ${scheduledTime || '11:00 AM'}`,
        },
      });
    }

    res.json(schedule);
  })
);

// =============================================================================
// Priced estimate (recommended products + GST breakdown)
// =============================================================================
router.post(
  '/:id/estimate',
  authenticate,
  requirePermission('measurements.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { picks, taxMode } = (req.body ?? {}) as { picks?: Record<string, number>; taxMode?: string };
    const estimate = await buildEstimate(id, {
      picks,
      taxMode: taxMode === 'INTER' ? 'INTER' : 'INTRA',
    });
    res.json(estimate);
  })
);

// =============================================================================
// Downloadable measurement & price sheet (all taxes included)
// GET — auto-recommended products · POST — honour admin product selection
// =============================================================================
async function sendSheet(req: AuthRequest, res: any, id: number, picks?: Record<string, number>, taxMode?: string) {
  const estimate = await buildEstimate(id, {
    picks,
    taxMode: taxMode === 'INTER' ? 'INTER' : 'INTRA',
  });
  const html = renderEstimateHtml(estimate);
  const filename = `measurement-price-${estimate.measurementBusinessId ?? `M-${id}`}-${taxMode === 'INTER' ? 'IGST' : 'CGST-SGST'}.html`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(html);
}

router.get(
  '/:id/sheet',
  authenticate,
  requirePermission('measurements.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const taxMode = String(req.query.taxMode ?? 'INTRA');
    await sendSheet(req, res, id, undefined, taxMode);
  })
);

router.post(
  '/:id/sheet',
  authenticate,
  requirePermission('measurements.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { picks, taxMode } = (req.body ?? {}) as { picks?: Record<string, number>; taxMode?: string };
    await sendSheet(req, res, id, picks, taxMode);
  })
);

// =============================================================================
// Standard measurement CRUD
// =============================================================================
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
      customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
      enquiry: { select: { id: true, businessId: true, status: true } },
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
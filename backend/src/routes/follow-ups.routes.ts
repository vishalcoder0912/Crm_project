// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog } from '../utils/helpers';
import { generateBusinessId } from '../utils/idGenerator';
import { parsePaginationParams, buildPaginatedResult, getPrismaSkipTake } from '../utils/pagination';
import { FOLLOWUP_STATUS, FOLLOWUP_PRIORITY, FOLLOWUP_CHANNEL } from '../config/constants';

const router = Router();

const INCLUDE = {
  customer: { select: { id: true, name: true, phone: true, businessId: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  enquiry: { select: { id: true, businessId: true, status: true } },
  order: { select: { id: true, businessId: true, status: true } },
  branch: { select: { id: true, name: true, code: true } },
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfTomorrow(): Date {
  const start = startOfToday();
  start.setDate(start.getDate() + 1);
  return start;
}

function bucketWhere(bucket: string): Record<string, unknown> | null {
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  if (bucket === 'OVERDUE') {
    return { status: FOLLOWUP_STATUS.PENDING, dueAt: { lt: today } };
  }
  if (bucket === 'TODAY') {
    return { status: FOLLOWUP_STATUS.PENDING, dueAt: { gte: today, lt: tomorrow } };
  }
  if (bucket === 'UPCOMING') {
    return { status: FOLLOWUP_STATUS.PENDING, dueAt: { gte: tomorrow } };
  }
  return null;
}

router.get(
  '/stats',
  authenticate,
  requirePermission('follow_ups.read'),
  asyncHandler(async (_req: AuthRequest, res) => {
    const today = startOfToday();
    const tomorrow = startOfTomorrow();
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [overdue, todayCount, upcoming, pending, completedThisWeek, byPriorityRaw, byChannelRaw] =
      await Promise.all([
        prisma.followUp.count({ where: { status: 'PENDING', dueAt: { lt: today } } }),
        prisma.followUp.count({ where: { status: 'PENDING', dueAt: { gte: today, lt: tomorrow } } }),
        prisma.followUp.count({ where: { status: 'PENDING', dueAt: { gte: tomorrow } } }),
        prisma.followUp.count({ where: { status: 'PENDING' } }),
        prisma.followUp.count({ where: { status: 'COMPLETED', completedAt: { gte: weekAgo } } }),
        prisma.followUp.groupBy({
          by: ['priority'],
          where: { status: 'PENDING' },
          _count: { _all: true },
        }),
        prisma.followUp.groupBy({
          by: ['channel'],
          where: { status: 'COMPLETED', completedAt: { gte: weekAgo } },
          _count: { _all: true },
        }),
      ]);

    res.json({
      overdue,
      today: todayCount,
      upcoming,
      pending,
      completedThisWeek,
      byPriority: byPriorityRaw.map((r) => ({ priority: r.priority, count: r._count._all })),
      byChannel: byChannelRaw.map((r) => ({ channel: r.channel, count: r._count._all })),
    });
  })
);

router.get(
  '/',
  authenticate,
  requirePermission('follow_ups.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const params = parsePaginationParams(req.query);
    const where: Record<string, unknown> = {};

    const q = (req.query.q as string)?.trim();
    if (q) {
      where.OR = [
        { purpose: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        { businessId: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    for (const field of ['status', 'priority', 'channel', 'assignedToId', 'customerId', 'branchId', 'enquiryId', 'orderId']) {
      if (req.query[field] !== undefined && req.query[field] !== '') {
        where[field] = field.endsWith('Id') ? Number(req.query[field]) : req.query[field];
      }
    }

    const bucket = req.query.bucket as string | undefined;
    if (bucket) {
      const bucketFilter = bucketWhere(bucket);
      if (bucketFilter) Object.assign(where, bucketFilter);
    }

    const [totalItems, data] = await Promise.all([
      prisma.followUp.count({ where }),
      prisma.followUp.findMany({
        where,
        ...getPrismaSkipTake({ ...params }),
        orderBy: [{ dueAt: 'asc' }],
        include: INCLUDE,
      }),
    ]);

    res.json(buildPaginatedResult(data, totalItems, params));
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('follow_ups.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const record = await prisma.followUp.findUnique({ where: { id }, include: INCLUDE });
    if (!record) {
      throw new NotFoundError('FollowUp', id);
    }
    res.json(record);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('follow_ups.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as any;
    if (!body.customerId) {
      throw new ValidationError('customerId is required');
    }
    if (!body.purpose) {
      throw new ValidationError('purpose is required');
    }
    if (!body.dueAt) {
      throw new ValidationError('dueAt is required');
    }

    const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
    if (!customer) {
      throw new ValidationError('customerId does not exist');
    }
    if (body.priority && !Object.values(FOLLOWUP_PRIORITY).includes(body.priority)) {
      throw new ValidationError(`priority must be one of: ${Object.values(FOLLOWUP_PRIORITY).join(', ')}`);
    }
    if (body.channel && !Object.values(FOLLOWUP_CHANNEL).includes(body.channel)) {
      throw new ValidationError(`channel must be one of: ${Object.values(FOLLOWUP_CHANNEL).join(', ')}`);
    }

    const refMap: [string, unknown][] = [
      ['enquiryId', body.enquiryId],
      ['orderId', body.orderId],
      ['branchId', body.branchId],
      ['assignedToId', body.assignedToId],
    ];
    const refErrors: string[] = [];
    await Promise.all(
      refMap.map(async ([field, value]) => {
        if (value === undefined || value === null || value === '') return;
        const id = Number(value);
        if (!Number.isFinite(id) || id <= 0) {
          refErrors.push(`${field} must be a valid number`);
          return;
        }
        let exists = false;
        if (field === 'enquiryId') exists = !!(await prisma.enquiry.findUnique({ where: { id } }));
        else if (field === 'orderId') exists = !!(await prisma.order.findUnique({ where: { id } }));
        else if (field === 'branchId') exists = !!(await prisma.branch.findUnique({ where: { id } }));
        else exists = !!(await prisma.user.findUnique({ where: { id } }));
        if (!exists) refErrors.push(`${field} ${id} does not exist`);
      })
    );
    if (refErrors.length) {
      throw new ValidationError(refErrors.join('; '));
    }

    const businessId = await generateBusinessId('followUp', 'follow_ups');
    const record = await prisma.followUp.create({
      data: {
        businessId,
        customerId: Number(body.customerId),
        enquiryId: body.enquiryId ? Number(body.enquiryId) : null,
        orderId: body.orderId ? Number(body.orderId) : null,
        branchId: body.branchId ? Number(body.branchId) : customer.branchId,
        purpose: body.purpose,
        channel: body.channel ?? null,
        dueAt: new Date(body.dueAt),
        priority: body.priority ?? FOLLOWUP_PRIORITY.MEDIUM,
        status: FOLLOWUP_STATUS.PENDING,
        assignedToId: body.assignedToId ? Number(body.assignedToId) : customer.assignedEmployeeId,
        createdById: req.user!.userId,
        notes: body.notes ?? null,
      },
      include: INCLUDE,
    });

    await createAuditLog(req, 'CREATE', 'followUp', record.id, null, record.businessId);
    res.status(201).json(record);
  })
);

router.patch(
  '/:id',
  authenticate,
  requirePermission('follow_ups.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FollowUp', id);
    }

    const body = req.body as any;
    const data: Record<string, unknown> = {};
    for (const field of ['purpose', 'channel', 'priority', 'status', 'notes']) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (body.dueAt !== undefined) data.dueAt = new Date(body.dueAt);

    if (body.assignedToId !== undefined) {
      if (body.assignedToId === null || body.assignedToId === '') {
        data.assignedToId = null;
      } else {
        const uid = Number(body.assignedToId);
        if (!Number.isFinite(uid) || uid <= 0) {
          throw new ValidationError('assignedToId must be a valid number');
        }
        const user = await prisma.user.findUnique({ where: { id: uid } });
        if (!user) {
          throw new ValidationError(`assignedToId ${uid} does not exist`);
        }
        data.assignedToId = uid;
      }
    }

    if (data.priority && !(Object.values(FOLLOWUP_PRIORITY) as string[]).includes(data.priority as string)) {
      throw new ValidationError(`priority must be one of: ${Object.values(FOLLOWUP_PRIORITY).join(', ')}`);
    }
    if (data.status && !(Object.values(FOLLOWUP_STATUS) as string[]).includes(data.status as string)) {
      throw new ValidationError(`status must be one of: ${Object.values(FOLLOWUP_STATUS).join(', ')}`);
    }

    if (data.status === FOLLOWUP_STATUS.COMPLETED) {
      data.completedAt = new Date();
    }

    const record = await prisma.followUp.update({ where: { id }, data, include: INCLUDE });
    await createAuditLog(req, 'UPDATE', 'followUp', id, existing.status, String(record.status));
    res.json(record);
  })
);

router.post(
  '/:id/complete',
  authenticate,
  requirePermission('follow_ups.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FollowUp', id);
    }
    if (existing.status === FOLLOWUP_STATUS.COMPLETED) {
      throw new BusinessRuleError('Follow-up is already completed');
    }
    if (existing.status === FOLLOWUP_STATUS.CANCELLED) {
      throw new BusinessRuleError('Cancelled follow-ups cannot be completed');
    }

    const record = await prisma.followUp.update({
      where: { id },
      data: {
        status: FOLLOWUP_STATUS.COMPLETED,
        completedAt: new Date(),
        notes: (req.body as any)?.notes ?? existing.notes,
      },
      include: INCLUDE,
    });

    await createAuditLog(req, 'COMPLETE', 'followUp', id, existing.status, FOLLOWUP_STATUS.COMPLETED);
    res.json(record);
  })
);

export default router;

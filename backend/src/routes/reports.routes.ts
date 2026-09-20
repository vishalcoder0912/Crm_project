// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { buildSummary, lastMonths, monthKey } from '../services/summary';

const router = Router();

const auth = [authenticate, requirePermission('reports.read')];

function branchWhere(q: unknown): Record<string, unknown> {
  const n = Number(q);
  if (Number.isFinite(n) && n > 0) return { branchId: n };
  return {};
}

// Full analysis payload (same shape as /dashboard/summary)
router.get(
  '/summary',
  auth,
  asyncHandler(async (req, res) => {
    res.json(await buildSummary(req.query.branchId));
  })
);

// Revenue trend — confirmed payments per month (default 12 months back)
router.get(
  '/revenue',
  auth,
  asyncHandler(async (req, res) => {
    const months = lastMonths(12);
    const series = months.map((m) => ({ month: m.label, revenue: 0 }));
    const byKey = new Map(months.map((m, i) => [m.key, i]));
    const payments = await prisma.payment.findMany({
      where: { status: 'CONFIRMED' },
      select: { paymentDate: true, amount: true },
    });
    for (const p of payments) {
      const idx = byKey.get(monthKey(new Date(p.paymentDate)));
      if (idx !== undefined) series[idx].revenue += Number(p.amount);
    }
    res.json({ period: `${months[0].label} - ${months[months.length - 1].label}`, series });
  })
);

// Sales funnel — enquiry pipeline progression
router.get(
  '/funnel',
  auth,
  asyncHandler(async (_req, res) => {
    const raw = await prisma.enquiry.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } });
    const map = new Map(raw.map((r) => [r.status, r._count._all]));
    const order = ['NEW', 'CONTACTED', 'MEASUREMENT_PENDING', 'MEASURED', 'QUOTATION_PENDING', 'QUOTATION_SENT', 'WON', 'LOST'];
    res.json({ funnel: order.map((status) => ({ status, count: map.get(status) ?? 0 })) });
  })
);

// Enquiry analytics — lead sources and lost reasons
router.get(
  '/enquiries',
  auth,
  asyncHandler(async (_req, res) => {
    const [sources, lostReasons, total] = await Promise.all([
      prisma.enquiry.groupBy({ by: ['source'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.enquiry.groupBy({
        by: ['lostReason'],
        where: { deletedAt: null, status: 'LOST', lostReason: { not: null } },
        _count: { _all: true },
      }),
      prisma.enquiry.count({ where: { deletedAt: null } }),
    ]);
    res.json({
      total,
      sources: sources.map((s) => ({ source: s.source ?? 'Unknown', count: s._count._all })),
      lostReasons: lostReasons.map((l) => ({ reason: l.lostReason ?? 'Other', count: l._count._all })),
    });
  })
);

// Quotation analytics — status distribution and acceptance rate
router.get(
  '/quotations',
  auth,
  asyncHandler(async (_req, res) => {
    const [rows, total, accepted] = await Promise.all([
      prisma.quotation.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.quotation.count({ where: { deletedAt: null } }),
      prisma.quotation.count({ where: { deletedAt: null, status: 'ACCEPTED' } }),
    ]);
    res.json({
      total,
      accepted,
      acceptanceRate: total ? Math.round((accepted / total) * 100) : 0,
      byStatus: rows.map((r) => ({ status: r.status, count: r._count._all })),
    });
  })
);

// Customer growth — new customers per month (optional ?branchId=)
router.get(
  '/customers',
  auth,
  asyncHandler(async (req, res) => {
    const where = { deletedAt: null, ...branchWhere(req.query.branchId) };
    const months = lastMonths(12);
    const series = months.map((m) => ({ month: m.label, customers: 0 }));
    const byKey = new Map(months.map((m, i) => [m.key, i]));
    const rows = await prisma.customer.findMany({ where, select: { createdAt: true } });
    for (const c of rows) {
      const idx = byKey.get(monthKey(new Date(c.createdAt)));
      if (idx !== undefined) series[idx].customers += 1;
    }
    res.json({ series });
  })
);

// Order pipeline — value and count per stage / status
router.get(
  '/orders',
  auth,
  asyncHandler(async (_req, res) => {
    const byStage = await prisma.order.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _sum: { totalAmount: true },
      _count: { _all: true },
    });
    res.json({
      count: byStage.reduce((sum, r) => sum + r._count._all, 0),
      byStage: byStage.map((r) => ({
        status: r.status,
        count: r._count._all,
        value: Number(r._sum.totalAmount ?? 0),
      })),
    });
  })
);

// Branch performance — orders and value per branch
router.get(
  '/branches',
  auth,
  asyncHandler(async (_req, res) => {
    const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    const rows = await prisma.customer.findMany({
      where: { deletedAt: null, branchId: { not: null } },
      select: { id: true, branchId: true },
    });
    const branchOfCustomer = new Map(rows.map((c) => [c.id, c.branchId as number]));
    const orders = await prisma.order.findMany({
      where: { deletedAt: null },
      select: { customerId: true, totalAmount: true },
    });
    const perf = branches.map((b) => ({ branchId: b.id, name: b.name, code: b.code, orders: 0, value: 0 }));
    const perfById = new Map(perf.map((p) => [p.branchId, p]));
    for (const o of orders) {
      const bid = branchOfCustomer.get(o.customerId);
      if (bid === undefined) continue;
      const row = perfById.get(bid);
      if (!row) continue;
      row.orders += 1;
      row.value += Number(o.totalAmount);
    }
    res.json({ branches: perf });
  })
);

// Team workload — pending follow-ups by owner
router.get(
  '/team',
  auth,
  asyncHandler(async (_req, res) => {
    const raw = await prisma.followUp.groupBy({ by: ['assignedToId'], where: { status: 'PENDING' }, _count: { _all: true } });
    const ids = raw.map((t) => t.assignedToId).filter((id): id is number => id !== null);
    const users = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } },
        })
      : [];
    const workload = raw
      .filter((t) => t.assignedToId !== null)
      .map((t) => {
        const u = users.find((x) => x.id === t.assignedToId);
        return {
          userId: t.assignedToId,
          name: u ? `${u.firstName} ${u.lastName}` : 'Unassigned',
          role: u?.role.name ?? '',
          pending: t._count._all,
        };
      })
      .sort((a, b) => b.pending - a.pending);
    res.json({ workload });
  })
);

// Stock report — total stock value and low-stock items
router.get(
  '/stock',
  auth,
  asyncHandler(async (_req, res) => {
    const allStock = await prisma.stock.findMany({ include: { sku: true } });
    const value = allStock.reduce((sum, s) => sum + Number(s.availableQty) * Number(s.sku.costPrice), 0);
    const lowStock = allStock.filter((s) => Number(s.availableQty) <= 10).map((s) => ({
      id: s.id,
      sku: s.sku.sku,
      name: s.sku.name,
      availableQty: s.availableQty,
      reservedQty: s.reservedQty,
      costPrice: s.sku.costPrice,
    }));
    res.json({ totalValue: value, itemCount: allStock.length, lowStock });
  })
);

export default router;
// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(count: number): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: d.toLocaleString('en-US', { month: 'short' }) });
  }
  return months;
}

router.get(
  '/summary',
  authenticate,
  requirePermission('reports.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const customerWhere: Record<string, unknown> = { deletedAt: null };
    if (branchId) customerWhere.branchId = branchId;

    const [
      customers,
      enquiries,
      openEnquiries,
      quotations,
      acceptedQuotations,
      orders,
      activeOrders,
      deliveriesPending,
      activeUsers,
      allStock,
      confirmedPayments,
      pendingPaymentsCount,
      recentOrders,
      lowStock,
      orderAgg,
      funnelRaw,
      pendingPaymentsAgg,
      followUpOverdue,
      followUpToday,
      followUpUpcoming,
      followUpCompletedWeek,
      atRiskEnquiries,
      sourceRaw,
      lostReasonRaw,
      quotationStatusRaw,
      teamRaw,
      ordersByStageRaw,
      recentPayments,
      recentCustomerRows,
      recentActivityRaw,
      branches,
      orderCustomerRows,
    ] = await Promise.all([
      prisma.customer.count({ where: customerWhere }),
      prisma.enquiry.count({ where: { deletedAt: null } }),
      prisma.enquiry.count({
        where: { deletedAt: null, status: { in: ['NEW', 'CONTACTED', 'MEASUREMENT_PENDING', 'MEASURED', 'QUOTATION_PENDING', 'QUOTATION_SENT'] } },
      }),
      prisma.quotation.count({ where: { deletedAt: null } }),
      prisma.quotation.count({ where: { status: 'ACCEPTED' } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.count({
        where: { deletedAt: null, status: { notIn: ['COMPLETED', 'CLOSED', 'DELIVERED'] } },
      }),
      prisma.order.count({ where: { deletedAt: null, deliveryStatus: { not: 'DELIVERED' } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.stock.findMany({ include: { sku: true } }),
      prisma.payment.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amount: true } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.order.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.stock.findMany({
        where: { availableQty: { lte: 10 } },
        include: { sku: { select: { id: true, sku: true, name: true } } },
      }),
      prisma.order.aggregate({ where: { deletedAt: null }, _sum: { totalAmount: true, balanceAmount: true } }),
      prisma.enquiry.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.payment.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { lt: today } } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { gte: today, lt: tomorrow } } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { gte: tomorrow } } }),
      prisma.followUp.count({ where: { status: 'COMPLETED', completedAt: { gte: weekAgo } } }),
      prisma.enquiry.findMany({
        where: {
          deletedAt: null,
          status: { in: ['QUOTATION_SENT', 'MEASUREMENT_PENDING', 'QUOTATION_PENDING'] },
          createdAt: { lt: sevenDaysAgo },
        },
        orderBy: { createdAt: 'asc' },
        take: 6,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.enquiry.groupBy({ by: ['source'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.enquiry.groupBy({
        by: ['lostReason'],
        where: { deletedAt: null, status: 'LOST', lostReason: { not: null } },
        _count: { _all: true },
      }),
      prisma.quotation.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      prisma.followUp.groupBy({ by: ['assignedToId'], where: { status: 'PENDING' }, _count: { _all: true } }),
      prisma.order.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        where: { status: 'CONFIRMED', paymentDate: { gte: sixMonthsAgo } },
        select: { paymentDate: true, amount: true },
      }),
      prisma.customer.findMany({
        where: { deletedAt: null, createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.order.findMany({
        where: { deletedAt: null },
        select: { customerId: true, totalAmount: true, status: true },
      }),
    ]);

    const FUNNEL_ORDER = ['NEW', 'CONTACTED', 'MEASUREMENT_PENDING', 'MEASURED', 'QUOTATION_PENDING', 'QUOTATION_SENT', 'WON'];
    const funnelMap = new Map(funnelRaw.map((f) => [f.status, f._count._all]));
    const salesFunnel = FUNNEL_ORDER.map((status) => ({ status, count: funnelMap.get(status) ?? 0 }));

    const stockValueTotal = allStock.reduce((sum, s) => sum + Number(s.availableQty) * Number(s.sku.costPrice), 0);

    const months = lastMonths(6);
    const revenueSeries = months.map((m) => ({ month: m.label, revenue: 0 }));
    const revenueByKey = new Map(months.map((m, i) => [m.key, i]));
    for (const p of recentPayments) {
      const idx = revenueByKey.get(monthKey(new Date(p.paymentDate)));
      if (idx !== undefined) revenueSeries[idx].revenue += Number(p.amount);
    }

    const customerSeries = months.map((m) => ({ month: m.label, customers: 0 }));
    const customerByKey = new Map(months.map((m, i) => [m.key, i]));
    for (const c of recentCustomerRows) {
      const idx = customerByKey.get(monthKey(new Date(c.createdAt)));
      if (idx !== undefined) customerSeries[idx].customers += 1;
    }

    const assignedIds = teamRaw.map((t) => t.assignedToId).filter((id): id is number => id !== null);
    const teamUsers = assignedIds.length
      ? await prisma.user.findMany({
          where: { id: { in: assignedIds } },
          select: { id: true, firstName: true, lastName: true, role: { select: { name: true } } },
        })
      : [];
    const teamWorkload = teamRaw
      .filter((t) => t.assignedToId !== null)
      .map((t) => {
        const user = teamUsers.find((u) => u.id === t.assignedToId);
        return {
          userId: t.assignedToId,
          name: user ? `${user.firstName} ${user.lastName}` : 'Unassigned',
          role: user?.role.name ?? '',
          pending: t._count._all,
        };
      })
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 6);

    const branchById = new Map(branches.map((b) => [b.id, b]));
    const customerBranchRows = await prisma.customer.findMany({
      where: { deletedAt: null, branchId: { not: null } },
      select: { id: true, branchId: true },
    });
    const branchOfCustomer = new Map(customerBranchRows.map((c) => [c.id, c.branchId as number]));
    const branchPerformance = branches.map((b) => ({ branchId: b.id, name: b.name, code: b.code, orders: 0, value: 0 }));
    const branchPerfById = new Map(branchPerformance.map((b) => [b.branchId, b]));
    for (const o of orderCustomerRows) {
      const bid = branchOfCustomer.get(o.customerId);
      if (bid === undefined) continue;
      const row = branchPerfById.get(bid);
      if (!row) continue;
      row.orders += 1;
      row.value += Number(o.totalAmount);
    }

    res.json({
      counts: {
        customers,
        enquiries,
        openEnquiries,
        quotations,
        acceptedQuotations,
        orders,
        activeOrders,
        deliveriesPending,
        activeUsers,
        pendingPayments: pendingPaymentsCount,
        branches: branches.length,
      },
      revenue: {
        confirmedPaymentTotal: confirmedPayments._sum.amount ?? 0,
        stockValue: stockValueTotal,
        totalOrderValue: orderAgg._sum.totalAmount ?? 0,
        outstanding: orderAgg._sum.balanceAmount ?? 0,
      },
      paymentBreakdown: {
        confirmed: Number(confirmedPayments._sum.amount ?? 0),
        pending: Number(pendingPaymentsAgg._sum.amount ?? 0),
      },
      followUps: {
        overdue: followUpOverdue,
        today: followUpToday,
        upcoming: followUpUpcoming,
        completedThisWeek: followUpCompletedWeek,
      },
      salesFunnel,
      atRiskEnquiries,
      enquirySources: sourceRaw.map((s) => ({ source: s.source ?? 'Unknown', count: s._count._all })),
      lostReasons: lostReasonRaw.map((l) => ({ reason: l.lostReason ?? 'Other', count: l._count._all })),
      quotationStatus: quotationStatusRaw.map((q) => ({ status: q.status, count: q._count._all })),
      teamWorkload,
      ordersByStage: ordersByStageRaw.map((o) => ({
        status: o.status,
        count: o._count._all,
        value: Number(o._sum.totalAmount ?? 0),
      })),
      revenueSeries,
      customerSeries,
      branchPerformance,
      recentActivity: recentActivityRaw,
      lowStock,
      lowStockItems: lowStock,
      recentOrders,
      branches: branches.map((b) => ({ id: b.id, name: b.name, code: b.code, city: b.city })),
    });
  })
);

export default router;

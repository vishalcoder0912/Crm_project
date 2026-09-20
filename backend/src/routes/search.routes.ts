import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const q = ((req.query.q as string) ?? '').trim();
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    if (q.length < 2) {
      res.json({ query: q, groups: [] });
      return;
    }

    const contains = { contains: q, mode: 'insensitive' as const };

    const [customers, enquiries, quotations, orders, products, skus, followUps] = await Promise.all([
      prisma.customer.findMany({
        where: {
          deletedAt: null,
          OR: [{ name: contains }, { phone: contains }, { email: contains }, { businessId: contains }],
        },
        take: limit,
        select: { id: true, businessId: true, name: true, phone: true, branch: { select: { name: true } } },
      }),
      prisma.enquiry.findMany({
        where: { deletedAt: null, OR: [{ businessId: contains }, { customer: { name: contains } }] },
        take: limit,
        select: { id: true, businessId: true, status: true, customer: { select: { name: true } } },
      }),
      prisma.quotation.findMany({
        where: { deletedAt: null, OR: [{ businessId: contains }, { customer: { name: contains } }] },
        take: limit,
        select: { id: true, businessId: true, status: true, customer: { select: { name: true } } },
      }),
      prisma.order.findMany({
        where: { deletedAt: null, OR: [{ businessId: contains }, { customer: { name: contains } }] },
        take: limit,
        select: { id: true, businessId: true, status: true, customer: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { OR: [{ name: contains }, { category: contains }] },
        take: limit,
        select: { id: true, name: true, category: true },
      }),
      prisma.sKU.findMany({
        where: { OR: [{ sku: contains }, { name: contains }] },
        take: limit,
        select: { id: true, sku: true, name: true, unit: true },
      }),
      prisma.followUp.findMany({
        where: {
          OR: [{ businessId: contains }, { purpose: contains }, { customer: { name: contains } }],
        },
        take: limit,
        select: { id: true, businessId: true, status: true, purpose: true, dueAt: true, customer: { select: { name: true } } },
      }),
    ]);

    const groups = [
      {
        type: 'Customers',
        icon: 'users',
        items: customers.map((c) => ({
          id: c.id,
          businessId: c.businessId,
          title: c.name,
          subtitle: [c.phone, c.branch?.name].filter(Boolean).join(' · '),
          route: `/customers/${c.id}`,
        })),
      },
      {
        type: 'Enquiries',
        icon: 'inbox',
        items: enquiries.map((e) => ({
          id: e.id,
          businessId: e.businessId,
          title: `${e.businessId} · ${e.customer?.name ?? ''}`,
          subtitle: e.status,
          route: `/enquiries/${e.id}`,
        })),
      },
      {
        type: 'Quotations',
        icon: 'file-text',
        items: quotations.map((q) => ({
          id: q.id,
          businessId: q.businessId,
          title: `${q.businessId} · ${q.customer?.name ?? ''}`,
          subtitle: q.status,
          route: `/quotations/${q.id}`,
        })),
      },
      {
        type: 'Orders',
        icon: 'shopping-cart',
        items: orders.map((o) => ({
          id: o.id,
          businessId: o.businessId,
          title: `${o.businessId} · ${o.customer?.name ?? ''}`,
          subtitle: o.status,
          route: `/orders/${o.id}`,
        })),
      },
      {
        type: 'Follow-ups',
        icon: 'bell',
        items: followUps.map((f) => ({
          id: f.id,
          businessId: f.businessId,
          title: f.purpose,
          subtitle: `${f.customer?.name ?? ''} · ${f.status}`,
          route: `/follow-ups`,
        })),
      },
      {
        type: 'Products',
        icon: 'package',
        items: products.map((p) => ({
          id: p.id,
          businessId: '',
          title: p.name,
          subtitle: p.category,
          route: `/products`,
        })),
      },
      {
        type: 'SKUs',
        icon: 'tag',
        items: skus.map((s) => ({
          id: s.id,
          businessId: s.sku,
          title: s.name,
          subtitle: s.unit,
          route: `/products`,
        })),
      },
    ].filter((g) => g.items.length > 0);

    res.json({ query: q, groups });
  })
);

export default router;

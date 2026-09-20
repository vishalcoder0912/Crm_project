// hello this is vishal project
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
    const limit = Math.min(Number(req.query.limit) || 6, 25);
    if (q.length < 2) {
      res.json({ query: q, groups: [] });
      return;
    }

    const contains = { contains: q, mode: 'insensitive' as const };
    const digitsOnly = q.replace(/\D/g, '');
    const phoneFilter =
      digitsOnly.length >= 3
        ? [{ phone: { contains: digitsOnly } }, { phone: contains }]
        : [{ phone: contains }];

    const custPhoneFilter =
      digitsOnly.length >= 3
        ? [{ customer: { phone: { contains: digitsOnly } } }, { customer: { phone: contains } }]
        : [{ customer: { phone: contains } }];

    const [customers, measurements, enquiries, quotations, orders, products, skus, followUps] = await Promise.all([
      prisma.customer.findMany({
        where: {
          deletedAt: null,
          OR: [{ name: contains }, ...phoneFilter, { email: contains }, { businessId: contains }, { address: contains }],
        },
        take: limit,
        select: { id: true, businessId: true, name: true, phone: true, address: true, branch: { select: { name: true } } },
      }),
      prisma.measurement.findMany({
        where: {
          OR: [
            { businessId: contains },
            { customer: { name: contains } },
            ...custPhoneFilter,
            { notes: contains },
          ],
        },
        take: limit,
        select: {
          id: true,
          businessId: true,
          status: true,
          measurementDate: true,
          customer: { select: { id: true, name: true, phone: true } },
          items: { select: { id: true, room: true } },
        },
      }),
      prisma.enquiry.findMany({
        where: {
          deletedAt: null,
          OR: [{ businessId: contains }, { customer: { name: contains } }, ...custPhoneFilter],
        },
        take: limit,
        select: { id: true, businessId: true, status: true, customer: { select: { name: true, phone: true } } },
      }),
      prisma.quotation.findMany({
        where: {
          deletedAt: null,
          OR: [{ businessId: contains }, { customer: { name: contains } }, ...custPhoneFilter],
        },
        take: limit,
        select: { id: true, businessId: true, status: true, customer: { select: { name: true, phone: true } } },
      }),
      prisma.order.findMany({
        where: {
          deletedAt: null,
          OR: [{ businessId: contains }, { customer: { name: contains } }, ...custPhoneFilter],
        },
        take: limit,
        select: { id: true, businessId: true, status: true, customer: { select: { name: true, phone: true } } },
      }),
      prisma.product.findMany({
        where: { OR: [{ name: contains }, { category: contains }] },
        take: limit,
        select: { id: true, name: true, category: true },
      }),
      prisma.sKU.findMany({
        where: { OR: [{ sku: contains }, { name: contains }] },
        take: limit,
        select: { id: true, sku: true, name: true, unit: true, sellingPrice: true },
      }),
      prisma.followUp.findMany({
        where: {
          OR: [{ businessId: contains }, { purpose: contains }, { customer: { name: contains } }, ...custPhoneFilter],
        },
        take: limit,
        select: { id: true, businessId: true, status: true, purpose: true, dueAt: true, customer: { select: { name: true, phone: true } } },
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
          subtitle: [c.phone, c.branch?.name, c.address].filter(Boolean).join(' · '),
          route: `/customers/${c.id}`,
        })),
      },
      {
        type: 'Measurements',
        icon: 'grid',
        items: measurements.map((m) => ({
          id: m.id,
          businessId: m.businessId,
          title: `${m.businessId} · ${m.customer?.name ?? 'Client'}`,
          subtitle: `${m.customer?.phone ?? ''} · ${m.items.length} items (${m.status})`,
          route: `/measurements`,
        })),
      },
      {
        type: 'Enquiries',
        icon: 'inbox',
        items: enquiries.map((e) => ({
          id: e.id,
          businessId: e.businessId,
          title: `${e.businessId} · ${e.customer?.name ?? ''}`,
          subtitle: `${e.customer?.phone ?? ''} · ${e.status}`,
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
          subtitle: `${q.customer?.phone ?? ''} · ${q.status}`,
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
          subtitle: `${o.customer?.phone ?? ''} · ${o.status}`,
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
          subtitle: `${f.customer?.name ?? ''} (${f.customer?.phone ?? ''}) · ${f.status}`,
          route: `/follow-ups`,
        })),
      },
      {
        type: 'Products & Fabrics',
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
          subtitle: `${s.unit} · ₹${s.sellingPrice}`,
          route: `/products`,
        })),
      },
    ].filter((g) => g.items.length > 0);

    res.json({ query: q, groups });
  })
);

export default router;

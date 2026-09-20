// hello this is vishal project
// =============================================================================
// Calendar — aggregated business activity for date-based and store-based filtering.
// Combines measurement schedules, installations, follow-ups, enquiries and
// payments into a single feed that supports searching by customer name and phone.
// GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD&type=&assigneeId=&branchId=&q=
// =============================================================================
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate } from '../middleware/auth';
import { requireAnyPermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_TYPES = ['MEASUREMENT_SCHEDULE', 'INSTALLATION', 'FOLLOW_UP', 'ENQUIRY', 'PAYMENT'] as const;

type CalendarEvent = {
  id: number | string;
  type: (typeof EVENT_TYPES)[number];
  title: string;
  sub: string;
  date: string; // YYYY-MM-DD (local)
  time: string | null;
  status: string | null;
  assignee: string | null;
  branch: string | null;
  customerId: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  route: string;
};

function localDate(v: Date | string): string {
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function localTime(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

router.get(
  '/events',
  authenticate,
  requireAnyPermission('measurements.read', 'installations.read', 'follow_ups.read', 'enquiries.read', 'payments.read'),
  asyncHandler(async (req, res) => {
    const from = String(req.query.from ?? '');
    const to = String(req.query.to ?? '');
    const type = String(req.query.type ?? '').toUpperCase();
    const assigneeId = req.query.assigneeId ? Number(req.query.assigneeId) : undefined;
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const digitsOnly = q.replace(/\D/g, '');

    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      const valid = [...EVENT_TYPES];
      res.status(400).json({ error: { message: 'from and to are required as YYYY-MM-DD' }, types: valid });
      return;
    }

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    const wanted = (t: string) => !type || type === 'ALL' || t === type;

    let events: CalendarEvent[] = [];
    const tasks: Promise<any>[] = [];

    if (wanted('MEASUREMENT_SCHEDULE')) {
      tasks.push(
        prisma.measurementSchedule
          .findMany({
            where: { scheduledDate: { gte: start, lte: end }, ...(assigneeId ? { assignedToId: assigneeId } : {}) },
            include: {
              assignedTo: { select: { id: true, firstName: true, lastName: true } },
              enquiry: {
                include: {
                  customer: { select: { id: true, name: true, phone: true, address: true, branch: { select: { name: true, code: true } } } },
                },
              },
            },
            orderBy: { scheduledDate: 'asc' },
          })
          .then((rows) =>
            rows.forEach((m) => {
              const cust = m.enquiry?.customer;
              events.push({
                id: m.id,
                type: 'MEASUREMENT_SCHEDULE',
                title: `Doorstep Measurement · ${cust?.name ?? m.customerName ?? 'Customer'}`,
                sub: `${m.siteAddress ?? cust?.address ?? ''}${m.phone ? ` · 📞 ${m.phone}` : ''}${m.scheduledTime ? ` · ${m.scheduledTime}` : ''}`,
                date: localDate(m.scheduledDate),
                time: m.scheduledTime ?? null,
                status: m.status,
                assignee: m.assignedTo ? `${m.assignedTo.firstName} ${m.assignedTo.lastName}` : null,
                branch: cust?.branch?.name ?? 'Ghaziabad',
                customerId: cust?.id ?? null,
                customerName: cust?.name ?? m.customerName,
                customerPhone: m.phone || cust?.phone || null,
                route: `/measurements`,
              });
            })
          )
      );
    }

    if (wanted('INSTALLATION')) {
      tasks.push(
        prisma.installation
          .findMany({
            where: { scheduledDate: { gte: start, lte: end } },
            include: {
              customer: { select: { id: true, name: true, phone: true, branch: { select: { name: true } } } },
              order: { select: { businessId: true } },
              vehicle: { select: { registrationNo: true } },
            },
            orderBy: { scheduledDate: 'asc' },
          })
          .then((rows) =>
            rows.forEach((ins) => {
              events.push({
                id: ins.id,
                type: 'INSTALLATION',
                title: `Installation & Fitting · ${ins.customer?.name ?? 'Customer'}`,
                sub: `${ins.order?.businessId ?? ''}${ins.customer?.phone ? ` · 📞 ${ins.customer.phone}` : ''}${ins.vehicle?.registrationNo ? ` · 🚚 ${ins.vehicle.registrationNo}` : ''}`,
                date: localDate(ins.scheduledDate),
                time: ins.scheduledTime ?? null,
                status: ins.status,
                assignee: null,
                branch: ins.customer?.branch?.name ?? 'All Branches',
                customerId: ins.customerId,
                customerName: ins.customer?.name,
                customerPhone: ins.customer?.phone,
                route: `/installations`,
              });
            })
          )
      );
    }

    if (wanted('FOLLOW_UP')) {
      tasks.push(
        prisma.followUp
          .findMany({
            where: { dueAt: { gte: start, lte: end }, ...(assigneeId ? { assignedToId: assigneeId } : {}), ...(branchId ? { branchId } : {}) },
            include: {
              customer: { select: { id: true, name: true, phone: true, branch: { select: { name: true } } } },
              assignedTo: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { dueAt: 'asc' },
          })
          .then((rows) =>
            rows.forEach((f) => {
              events.push({
                id: f.id,
                type: 'FOLLOW_UP',
                title: `${f.purpose} · ${f.customer?.name ?? 'Customer'}`,
                sub: `${f.channel ? `${f.channel} · ` : ''}${f.customer?.phone ? `📞 ${f.customer.phone}` : ''}`,
                date: localDate(f.dueAt),
                time: localTime(f.dueAt),
                status: f.status,
                assignee: f.assignedTo ? `${f.assignedTo.firstName} ${f.assignedTo.lastName}` : null,
                branch: f.customer?.branch?.name ?? null,
                customerId: f.customerId,
                customerName: f.customer?.name,
                customerPhone: f.customer?.phone,
                route: `/follow-ups`,
              });
            })
          )
      );
    }

    if (wanted('ENQUIRY')) {
      tasks.push(
        prisma.enquiry
          .findMany({
            where: { enquiryDate: { gte: start, lte: end }, ...(branchId ? { customer: { branchId } } : {}) },
            include: { customer: { select: { id: true, name: true, phone: true, branchId: true, branch: { select: { name: true } } } } },
            orderBy: { enquiryDate: 'asc' },
          })
          .then((rows) =>
            rows.forEach((e) => {
              events.push({
                id: e.id,
                type: 'ENQUIRY',
                title: `${e.businessId} · ${e.customer?.name ?? 'Customer'}`,
                sub: `${e.source ? `${e.source} · ` : ''}${e.customer?.phone ? `📞 ${e.customer.phone}` : ''}`,
                date: localDate(e.enquiryDate),
                time: null,
                status: e.status,
                assignee: null,
                branch: e.customer?.branch?.name ?? null,
                customerId: e.customer?.id ?? null,
                customerName: e.customer?.name,
                customerPhone: e.customer?.phone,
                route: `/enquiries`,
              });
            })
          )
      );
    }

    if (wanted('PAYMENT')) {
      tasks.push(
        prisma.payment
          .findMany({
            where: { paymentDate: { gte: start, lte: end } },
            include: {
              customer: { select: { id: true, name: true, phone: true } },
              order: { select: { businessId: true } },
            },
            orderBy: { paymentDate: 'asc' },
          })
          .then((rows) =>
            rows.forEach((p) => {
              events.push({
                id: p.id,
                type: 'PAYMENT',
                title: `Payment ${p.businessId ?? '·'} · ${p.customer?.name ?? ''}`,
                sub: `${p.paymentType ?? ''}${p.paymentMethod ? ` · ${p.paymentMethod}` : ''}${p.customer?.phone ? ` · 📞 ${p.customer.phone}` : ''}`,
                date: localDate(p.paymentDate),
                time: localTime(p.paymentDate),
                status: p.status,
                assignee: null,
                branch: null,
                customerId: p.customerId,
                customerName: p.customer?.name,
                customerPhone: p.customer?.phone,
                route: `/payments`,
              });
            })
          )
      );
    }

    await Promise.all(tasks);

    // Apply customer name or phone filter if q provided
    if (q) {
      events = events.filter((e) => {
        const nameMatch = (e.customerName ?? '').toLowerCase().includes(q) || e.title.toLowerCase().includes(q);
        const phoneMatch = digitsOnly.length >= 3 && (e.customerPhone ?? '').includes(digitsOnly);
        const subMatch = e.sub.toLowerCase().includes(q);
        return nameMatch || phoneMatch || subMatch;
      });
    }

    events.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
    res.json({ from, to, query: { type: type || 'ALL', assigneeId, branchId, q }, total: events.length, events });
  })
);

export default router;
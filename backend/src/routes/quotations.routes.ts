// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { generateBusinessId } from '../utils/idGenerator';
import {
  createAuditLog,
  createNotification,
  computeLineTotals,
  sumDocumentTotals,
  round2,
} from '../utils/helpers';

const router = Router();

const QUOTATION_LIST_INCLUDES = {
  customer: { select: { id: true, name: true, phone: true } },
  enquiry: { select: { id: true, businessId: true } },
  site: true,
  acceptedVersion: true,
  versions: {
    orderBy: { versionNumber: 'desc' as const },
    take: 1,
    include: { items: true },
  },
};

export interface QuoteItemInput {
  skuId: number;
  measurementId?: number;
  measurementItemId?: number;
  room?: string;
  quantity: number;
  rate?: number;
  serviceCharge?: number;
  discountPercent?: number;
  taxPercent?: number;
  notes?: string;
}

export interface QuoteVersionInput {
  validityDate?: Date | string;
  advanceAmount?: number;
  notes?: string;
  changeReason?: string;
  items: QuoteItemInput[];
}

async function resolveQuoteItems(items: QuoteItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('At least one item is required');
  }

  const skuIds = [...new Set(items.map((i) => Number(i.skuId)))];
  const skus = await prisma.sku.findMany({ where: { id: { in: skuIds }, isActive: true } });
  if (skus.length !== skuIds.length) {
    throw new ValidationError('One or more SKUs are invalid or inactive');
  }
  const skuMap = new Map(skus.map((s) => [s.id, s]));

  return items.map((item) => {
    const sku = skuMap.get(Number(item.skuId))!;
    const rate = Number(item.rate) ?? 0;
    const serviceCharge = Number(item.serviceCharge ?? sku.serviceCharge) ?? 0;
    const discountPercent = Number(item.discountPercent ?? 0) || 0;
    const taxPercent = Number(item.taxPercent ?? sku.taxPercent) || 18;
    const qty = Number(item.quantity) || 0;

    const pricing = computeLineTotals({ quantity: qty, rate, serviceCharge, discountPercent, taxPercent });

    return {
      skuId: sku.id,
      measurementId: item.measurementId ?? null,
      measurementItemId: item.measurementItemId ?? null,
      room: item.room ?? null,
      productName: sku.name,
      quantity: qty,
      rate,
      serviceCharge,
      discountPercent,
      discountAmount: pricing.discountAmount,
      taxPercent,
      taxAmount: pricing.taxAmount,
      amount: pricing.amount,
      notes: item.notes ?? null,
    };
  });
}

async function buildVersionData(body: QuoteVersionInput, createdById: number) {
  const items = await resolveQuoteItems(body.items);
  const totals = sumDocumentTotals(items);
  const advanceAmount = round2(Number(body.advanceAmount) || 0);

  return {
    versionData: {
      validityDate: body.validityDate ? new Date(body.validityDate) : null,
      advanceAmount,
      notes: body.notes ?? null,
      changeReason: body.changeReason ?? null,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      balanceAmount: round2(totals.totalAmount - advanceAmount),
      createdById,
      items: { create: items },
    },
    totals,
    items,
  };
}

router.post(
  '/',
  authenticate,
  requirePermission('quotations.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as any;

    const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
    if (!customer) {
      throw new ValidationError('customerId does not exist');
    }
    if (body.enquiryId) {
      const enquiry = await prisma.enquiry.findUnique({ where: { id: Number(body.enquiryId) } });
      if (!enquiry) {
        throw new ValidationError('enquiryId does not exist');
      }
    }

    const { versionData } = await buildVersionData(body, req.user!.userId);
    const businessId = await generateBusinessId('quotation', 'quotations');

    const quotation = await prisma.quotation.create({
      data: {
        businessId,
        customerId: Number(body.customerId),
        enquiryId: body.enquiryId ?? null,
        siteId: body.siteId ?? null,
        status: 'DRAFT',
        versions: {
          create: {
            ...versionData,
            versionNumber: 1,
            versionLabel: 'ORIGINAL',
            status: 'DRAFT',
          },
        },
      },
      include: { versions: { include: { items: true } } },
    });

    await createAuditLog(req, 'CREATE', 'quotation', quotation.id, undefined, { businessId });
    res.status(201).json(quotation);
  })
);

router.get(
  '/',
  authenticate,
  requirePermission('quotations.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const where: Record<string, unknown> = { deletedAt: null };
    for (const field of ['customerId', 'enquiryId', 'siteId', 'status']) {
      if (req.query[field]) where[field] = Number(req.query[field]);
    }
    const q = (req.query.q as string)?.trim();
    if (q) {
      where.businessId = { contains: q, mode: 'insensitive' };
    }
    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: QUOTATION_LIST_INCLUDES,
    });
    res.json(quotations);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('quotations.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        enquiry: true,
        site: true,
        acceptedVersion: { include: { items: true } },
        versions: { include: { items: true, createdBy: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!quotation) {
      throw new NotFoundError('Quotation', id);
    }
    res.json(quotation);
  })
);

router.get(
  '/:id/versions',
  authenticate,
  requirePermission('quotations.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      throw new NotFoundError('Quotation', id);
    }
    const versions = await prisma.quotationVersion.findMany({
      where: { quotationId: id },
      orderBy: { versionNumber: 'desc' },
      include: { items: true },
    });
    res.json(versions);
  })
);

router.post(
  '/:id/versions',
  authenticate,
  requirePermission('quotations.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      throw new NotFoundError('Quotation', id);
    }
    if (quotation.status === 'ACCEPTED' || quotation.status === 'REJECTED') {
      throw new BusinessRuleError(`Cannot add versions to a ${quotation.status} quotation`);
    }

    const lastVersion = await prisma.quotationVersion.findFirst({
      where: { quotationId: id },
      orderBy: { versionNumber: 'desc' },
    });

    const { versionData } = await buildVersionData(req.body as QuoteVersionInput, req.user!.userId);
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await prisma.quotationVersion.create({
      data: {
        quotationId: id,
        versionNumber,
        versionLabel: `R${versionNumber - 1}`,
        status: 'DRAFT',
        ...versionData,
      },
      include: { items: true },
    });

    await createAuditLog(req, 'CREATE', 'quotation_version', version.id, undefined, {
      versionNumber,
    });
    res.status(201).json(version);
  })
);

router.post(
  '/:id/send',
  authenticate,
  requirePermission('quotations.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { versionId } = req.body as { versionId?: number };

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      throw new NotFoundError('Quotation', id);
    }
    if (quotation.status === 'ACCEPTED' || quotation.status === 'REJECTED') {
      throw new BusinessRuleError(`Cannot send a ${quotation.status} quotation`);
    }

    const version = await prisma.quotationVersion.findFirst({
      where: { quotationId: id, ...(versionId ? { id: versionId } : {}) },
      orderBy: { versionNumber: 'desc' },
    });
    if (!version) {
      throw new NotFoundError('Quotation version', versionId ?? 'latest');
    }

    await prisma.$transaction([
      prisma.quotationVersion.update({
        where: { id: version.id },
        data: { status: 'SENT' },
      }),
      prisma.quotation.update({ where: { id }, data: { status: 'SENT' } }),
    ]);

    await createAuditLog(req, 'STATUS_CHANGE', 'quotation', id, quotation.status, 'SENT');
    res.json({ success: true, version });
  })
);

router.post(
  '/:id/accept',
  authenticate,
  requirePermission('quotations.approve'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { versionId } = req.body as { versionId?: number };

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!quotation) {
      throw new NotFoundError('Quotation', id);
    }
    if (quotation.status === 'REJECTED') {
      throw new BusinessRuleError('A rejected quotation cannot be accepted');
    }

    const version = await prisma.quotationVersion.findFirst({
      where: { quotationId: id, ...(versionId ? { id: versionId } : {}) },
      orderBy: { versionNumber: 'desc' },
      include: { items: true },
    });
    if (!version) {
      throw new NotFoundError('Quotation version', versionId ?? 'latest');
    }
    if (version.status === 'SUPERSEDED') {
      throw new BusinessRuleError('This version was superseded');
    }

    const orderBusinessId = await generateBusinessId('order', 'orders');

    const order = await prisma.$transaction(async (tx) => {
      const pastVersions = await tx.quotationVersion.findMany({
        where: { quotationId: id, id: { not: version.id } },
      });
      for (const pv of pastVersions) {
        await tx.quotationVersion.update({
          where: { id: pv.id },
          data: { status: 'SUPERSEDED' },
        });
      }

      await tx.quotationVersion.update({ where: { id: version.id }, data: { status: 'ACCEPTED' } });
      await tx.quotation.update({
        where: { id },
        data: { status: 'ACCEPTED', acceptedVersionId: version.id },
      });

      const advanceAmount = Number(version.advanceAmount);
      const created = await tx.order.create({
        data: {
          businessId: orderBusinessId,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          siteId: quotation.siteId,
          subtotal: version.subtotal,
          discountAmount: version.discountAmount,
          taxAmount: version.taxAmount,
          totalAmount: version.totalAmount,
          advanceAmount,
          balanceAmount: Number(version.balanceAmount),
          status: 'CONFIRMED',
          paymentStatus: advanceAmount > 0 ? 'PARTIAL' : 'PENDING',
          createdById: req.user!.userId,
          items: {
            create: version.items.map((item) => ({
              skuId: item.skuId,
              measurementId: item.measurementId,
              measurementItemId: item.measurementItemId,
              room: item.room,
              productName: item.productName,
              quantity: item.quantity,
              rate: item.rate,
              serviceCharge: item.serviceCharge,
              discountPercent: item.discountPercent,
              discountAmount: item.discountAmount,
              taxPercent: item.taxPercent,
              taxAmount: item.taxAmount,
              amount: item.amount,
              status: 'PENDING',
              notes: item.notes,
            })),
          },
        },
        include: { items: true, customer: true },
      });
      return created;
    });

    await createAuditLog(req, 'STATUS_CHANGE', 'quotation', id, quotation.status, 'ACCEPTED');
    await createAuditLog(req, 'CREATE', 'order', order.id, undefined, { businessId: orderBusinessId });

    if (quotation.customer.assignedEmployeeId) {
      await createNotification(
        quotation.customer.assignedEmployeeId,
        'ORDER_CREATED',
        'Order Created',
        `Order ${orderBusinessId} was created from quotation ${quotation.businessId}`
      );
    }

    res.status(201).json(order);
  })
);

router.post(
  '/:id/reject',
  authenticate,
  requirePermission('quotations.update'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body as { reason?: string };

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      throw new NotFoundError('Quotation', id);
    }
    if (quotation.status === 'ACCEPTED') {
      throw new BusinessRuleError('An accepted quotation cannot be rejected');
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    await createAuditLog(req, 'STATUS_CHANGE', 'quotation', id, quotation.status, {
      status: 'REJECTED',
      reason,
    });
    res.json(updated);
  })
);

router.delete(
  '/:id',
  authenticate,
  requirePermission('quotations.delete'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      throw new NotFoundError('Quotation', id);
    }
    const orders = await prisma.order.count({ where: { quotationId: id } });
    if (orders > 0) {
      throw new BusinessRuleError('Cannot delete a quotation that has orders');
    }
    const updated = await prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ success: true, deleted: updated });
  })
);

export default router;
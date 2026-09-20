import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { createAuditLog } from '../utils/helpers';

const router = Router();

router.get(
  '/',
  authenticate,
  requirePermission('goods_receipts.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const where: Record<string, unknown> = {};
    if (req.query.poId) where.poId = Number(req.query.poId);
    if (req.query.vendorId) where.vendorId = Number(req.query.vendorId);

    const grns = await prisma.goodsReceipt.findMany({
      where,
      orderBy: { receivedDate: 'desc' },
      include: {
        purchaseOrder: { select: { id: true, businessId: true } },
        vendor: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { sku: true } },
      },
    });
    res.json(grns);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('goods_receipts.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const grn = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
        vendor: true,
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { sku: true } },
      },
    });
    if (!grn) {
      throw new NotFoundError('Goods Receipt', id);
    }
    res.json(grn);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('goods_receipts.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as any;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: Number(body.poId) },
      include: { items: true },
    });
    if (!po) {
      throw new NotFoundError('Purchase Order', body.poId);
    }
    if (po.status === 'CLOSED') {
      throw new BusinessRuleError('Cannot receive against a closed purchase order');
    }

    const items = body.items as { skuId: number; receivedQty: number; condition?: string; notes?: string }[];
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('At least one GRN item is required');
    }

    const poItemBySku = new Map(po.items.map((item) => [item.skuId, item]));

    const grnItems = items.map((item) => {
      const poItem = poItemBySku.get(Number(item.skuId));
      if (!poItem) {
        throw new ValidationError(`SKU ${item.skuId} is not part of this purchase order`);
      }
      const receivedQty = Number(item.receivedQty);
      if (isNaN(receivedQty) || receivedQty <= 0) {
        throw new ValidationError('receivedQty must be greater than zero');
      }
      const shortQty = Math.max(0, Number(poItem.quantity) - receivedQty);
      return {
        skuId: poItem.skuId,
        orderedQty: poItem.quantity,
        receivedQty,
        shortQty,
        condition: item.condition ?? 'GOOD',
        notes: item.notes ?? null,
      };
    });

    const grn = await prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceipt.create({
        data: {
          poId: po.id,
          vendorId: po.vendorId,
          receivedDate: body.receivedDate ? new Date(body.receivedDate) : new Date(),
          verifiedById: req.user!.userId,
          notes: body.notes ?? null,
          items: { create: grnItems },
        },
        include: { items: true },
      });

      for (const grnItem of grnItems) {
        const poItem = poItemBySku.get(grnItem.skuId)!;

        const newReceived = Number(poItem.receivedQty) + grnItem.receivedQty;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: newReceived },
        });

        if (req.user?.userId) {
          const stock = await tx.stock.findFirst({
            where: { skuId: grnItem.skuId, warehouse: 'MAIN' },
          });
          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { availableQty: Number(stock.availableQty) + grnItem.receivedQty },
            });
          } else {
            await tx.stock.create({
              data: {
                skuId: grnItem.skuId,
                warehouse: 'MAIN',
                availableQty: grnItem.receivedQty,
                unit: 'piece',
              },
            });
          }
        }
      }

      const updatedPoItems = await tx.purchaseOrderItem.findMany({ where: { poId: po.id } });
      const fullyReceived = updatedPoItems.every(
        (item) => Number(item.receivedQty) >= Number(item.quantity)
      );
      const poStatus = fullyReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED';

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: poStatus },
      });

      return created;
    });

    await createAuditLog(req, 'CREATE', 'goods_receipt', grn.id, undefined, { poId: po.id });

    const complete = await prisma.goodsReceipt.findUnique({
      where: { id: grn.id },
      include: {
        purchaseOrder: { select: { id: true, businessId: true } },
        vendor: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { sku: true } },
      },
    });
    res.status(201).json(complete);
  })
);

export default router;
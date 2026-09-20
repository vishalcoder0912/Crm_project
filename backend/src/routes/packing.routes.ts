// hello this is vishal project
import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../utils/asyncHandler';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { generateBusinessId } from '../utils/idGenerator';
import { createAuditLog } from '../utils/helpers';

const router = Router();

const SLIP_INCLUDES = {
  customer: { select: { id: true, name: true, phone: true } },
  order: { select: { id: true, businessId: true } },
  preparedBy: { select: { id: true, firstName: true, lastName: true } },
  packets: { include: { items: { include: { orderItem: { select: { id: true, productName: true } } } } } },
};

router.get(
  '/',
  authenticate,
  requirePermission('packing.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const where: Record<string, unknown> = {};
    if (req.query.customerId) where.customerId = Number(req.query.customerId);
    if (req.query.orderId) where.orderId = Number(req.query.orderId);
    const slips = await prisma.packingSlip.findMany({
      where,
      orderBy: { preparedAt: 'desc' },
      include: SLIP_INCLUDES,
    });
    res.json(slips);
  })
);

router.get(
  '/:id',
  authenticate,
  requirePermission('packing.read'),
  asyncHandler(async (req: AuthRequest, res) => {
    const id = parseInt(req.params.id, 10);
    const slip = await prisma.packingSlip.findUnique({ where: { id }, include: SLIP_INCLUDES });
    if (!slip) {
      throw new NotFoundError('Packing Slip', id);
    }
    res.json(slip);
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('packing.create'),
  asyncHandler(async (req: AuthRequest, res) => {
    const body = req.body as any;

    const order = await prisma.order.findUnique({ where: { id: Number(body.orderId) } });
    if (!order) {
      throw new NotFoundError('Order', body.orderId);
    }
    if (order.status === 'CLOSED') {
      throw new BusinessRuleError('Cannot pack a CLOSED order');
    }
    const customer = await prisma.customer.findUnique({ where: { id: Number(body.customerId) } });
    if (!customer) {
      throw new ValidationError('customerId does not exist');
    }

    const packets = Array.isArray(body.packets) ? body.packets : [];
    if (packets.length === 0) {
      throw new ValidationError('At least one packet is required');
    }

    const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    const itemMap = new Map(orderItems.map((i) => [i.id, i]));

    const packetData = packets.map((packet: any, index: number) => {
      const items = Array.isArray(packet.items) ? packet.items : [];
      if (items.length === 0) {
        throw new ValidationError(`Packet ${index + 1} has no items`);
      }
      return {
        packetNumber: packet.packetNumber ?? index + 1,
        notes: packet.notes ?? null,
        items: {
          create: items.map((item: any) => {
            const orderItem = itemMap.get(Number(item.orderItemId));
            if (!orderItem) {
              throw new ValidationError(
                `Order item ${item.orderItemId} does not belong to order ${order.businessId}`
              );
            }
            if (orderItem.status !== 'QC_PASSED') {
              throw new BusinessRuleError(
                `Item "${orderItem.productName}" is ${orderItem.status}; only QC_PASSED items can be packed`
              );
            }
            if (!item.quantity) {
              throw new ValidationError('quantity is required for each packet item');
            }
            return {
              orderItemId: orderItem.id,
              quantity: Number(item.quantity),
              notes: item.notes ?? null,
            };
          }),
        },
      };
    });

    const businessId = await generateBusinessId('packingSlip', 'packing_slips');

    const slip = await prisma.$transaction(async (tx) => {
      const created = await tx.packingSlip.create({
        data: {
          businessId,
          customerId: customer.id,
          orderId: order.id,
          totalPackets: body.totalPackets ?? packets.length,
          preparedById: req.user!.userId,
          notes: body.notes ?? null,
          packets: { create: packetData },
        },
        include: { packets: { include: { items: true } } },
      });

      const packedItemIds = new Set<number>();
      for (const packet of created.packets) {
        for (const item of packet.items) {
          packedItemIds.add(item.orderItemId);
          await tx.orderItem.update({
            where: { id: item.orderItemId },
            data: { status: 'PACKED' },
          });
        }
      }

      const remaining = await tx.orderItem.findMany({
        where: { orderId: order.id, status: { not: 'PACKED' } },
      });
      if (remaining.length === 0) {
        await tx.order.update({ where: { id: order.id }, data: { status: 'PACKED' } });
      }

      return created;
    });

    await createAuditLog(req, 'CREATE', 'packing_slip', slip.id, undefined, { businessId });
    res.status(201).json(slip);
  })
);

export default router;
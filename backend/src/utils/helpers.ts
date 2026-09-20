import prisma from '../config/database';
import { Request } from 'express';
import { AuthRequest } from '../middleware/auth';

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  entityType?: string,
  entityId?: number
): Promise<void> {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, entityType, entityId },
    });
  } catch {
    // Notifications must never break the primary flow.
  }
}

export async function createAuditLog(
  req: AuthRequest,
  action: string,
  entityType: string,
  entityId?: string | number,
  oldValue?: unknown,
  newValue?: unknown
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        userEmail: req.user?.email,
        action,
        entityType,
        entityId: entityId?.toString(),
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        ipAddress: (req as Request).ip,
      },
    });
  } catch {
    // Audit must never break the primary flow.
  }
}

export interface LinePricing {
  quantity: number;
  rate: number;
  serviceCharge?: number;
  discountPercent?: number;
  taxPercent?: number;
}

export interface LineTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  amount: number;
}

export function computeLineTotals(line: LinePricing): LineTotals {
  const quantity = Number(line.quantity) || 0;
  const rate = Number(line.rate) || 0;
  const serviceCharge = Number(line.serviceCharge) || 0;
  const discountPercent = Number(line.discountPercent) || 0;
  const taxPercent = Number(line.taxPercent) || 18;

  const base = quantity * rate;
  const subtotal = base + serviceCharge;
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * taxPercent) / 100;
  const amount = taxable + taxAmount;

  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    amount: round2(amount),
  };
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface DocumentTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export function sumDocumentTotals(items: LinePricing[]): DocumentTotals {
  const totals = items.map(computeLineTotals);
  const subtotal = round2(totals.reduce((s, t) => s + t.subtotal, 0));
  const discountAmount = round2(totals.reduce((s, t) => s + t.discountAmount, 0));
  const taxAmount = round2(totals.reduce((s, t) => s + t.taxAmount, 0));
  const totalAmount = round2(totals.reduce((s, t) => s + t.amount, 0));
  return { subtotal, discountAmount, taxAmount, totalAmount };
}

export async function recalcOrderPaymentStatus(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const payments = await prisma.payment.findMany({
    where: { orderId, status: 'CONFIRMED' },
  });

  const confirmed = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const total = Number(order.totalAmount);

  let paymentStatus: string;
  if (confirmed >= total && total > 0) {
    paymentStatus = 'PAID';
  } else if (confirmed > 0) {
    paymentStatus = 'PARTIAL';
  } else {
    paymentStatus = 'PENDING';
  }

  if (paymentStatus !== order.paymentStatus) {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus },
    });
  }
}

export async function recalcOrderDeliveryStatus(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { status: true },
  });

  if (items.length === 0) return;

  const installed = items.filter((i) => i.status === 'INSTALLED').length;
  const pending = items.length - installed;

  let deliveryStatus: string;
  let newStatus: string | null = null;
  if (installed === items.length) {
    deliveryStatus = 'DELIVERED';
    newStatus = 'DELIVERED';
  } else if (installed > 0) {
    deliveryStatus = 'PARTIAL';
  } else {
    deliveryStatus = 'PENDING';
  }

  const updates: Record<string, unknown> = { deliveryStatus };
  if (newStatus) updates.status = newStatus;

  await prisma.order.update({ where: { id: orderId }, data: updates });
}
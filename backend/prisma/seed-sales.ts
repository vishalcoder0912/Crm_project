// hello this is vishal project
import { PrismaClient } from '@prisma/client';
import { d, lineTotals, r2 } from './seed-helpers';
import type { OrderSeedInfo, OpsContext, SeedContext } from './seed-helpers';

const pad = (n: number, len = 4) => String(n).padStart(len, '0');

const SKU_KEYS = [
  'cur-blackout', 'cur-sheer', 'cur-linen', 'blind-roman', 'blind-roller', 'blind-zebra',
  'blind-wooden', 'rod-single', 'rod-double', 'track-motor', 'hw-bracket', 'hw-ring',
];

const QUOTATION_STATUSES = ['ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'SENT', 'SENT', 'SENT', 'NEGOTIATION', 'NEGOTIATION', 'DRAFT'];
const ORDER_STATUSES = ['COMPLETED', 'DELIVERED', 'INSTALLATION_SCHEDULED', 'PACKED', 'TAILORING', 'QC_PASSED', 'MATERIAL_AVAILABLE', 'CONFIRMED', 'QC_FAILED', 'PROCUREMENT_PENDING'];
const PAID_FRACTION = [1, 0.65, 0.5, 0.3, 0.3, 0, 0, 0.3, 0, 0];

function itemStatusFor(orderStatus: string): string {
  switch (orderStatus) {
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PARTIALLY_DELIVERED':
      return 'INSTALLED';
    case 'INSTALLATION_IN_PROGRESS':
    case 'INSTALLATION_SCHEDULED':
    case 'PACKED':
      return 'PACKED';
    case 'TAILORING':
      return 'TAILORING';
    case 'QC_PASSED':
      return 'QC_PASSED';
    case 'QC_FAILED':
      return 'QC_FAILED';
    case 'MATERIAL_AVAILABLE':
      return 'MATERIAL_AVAILABLE';
    case 'PROCUREMENT_PENDING':
      return 'PROCUREMENT_PENDING';
    default:
      return 'PENDING';
  }
}

function statusPath(status: string): string[] {
  const chain = ['CONFIRMED', 'PROCUREMENT_PENDING', 'MATERIAL_AVAILABLE', 'TAILORING', 'READY_FOR_QC', 'QC_PASSED', 'PACKED', 'INSTALLATION_SCHEDULED', 'INSTALLATION_IN_PROGRESS', 'DELIVERED', 'COMPLETED', 'CLOSED'];
  if (status === 'QC_FAILED') {
    return ['CONFIRMED', 'MATERIAL_AVAILABLE', 'TAILORING', 'READY_FOR_QC', 'QC_FAILED'];
  }
  const idx = chain.indexOf(status);
  return idx < 0 ? [status] : chain.slice(0, idx + 1);
}

export async function seedSales(prisma: PrismaClient, ctx: SeedContext): Promise<OpsContext> {
  const { users, skuIds, skuPrices } = ctx;
  const quotationIds: number[] = [];
  const versionItems: Array<Array<{ skuId: number; skuKey: string; productName: string; room: string; line: ReturnType<typeof lineTotals> }>> = [];

  // ---- Quotations ----
  for (let i = 0; i < 9; i++) {
    const customerId = ctx.enquiryCustomer[i];
    const siteId = ctx.enquirySite[i];
    const enquiryId = ctx.enquiryIds[i];
    const status = QUOTATION_STATUSES[i];
    const quotation = await prisma.quotation.create({
      data: { businessId: `QUO-${pad(i + 1)}`, customerId, enquiryId, siteId, status: status === 'ACCEPTED' ? 'ACCEPTED' : status, createdAt: d(55 - i * 4) },
    });
    quotationIds.push(quotation.id);

    const itemCount = 2 + (i % 2);
    const builtItems: Array<{ skuId: number; skuKey: string; productName: string; room: string; line: ReturnType<typeof lineTotals> }> = [];
    for (let it = 0; it < itemCount; it++) {
      const skuKey = SKU_KEYS[(i * 2 + it) % SKU_KEYS.length];
      const price = skuPrices[skuKey];
      const quantity = 4 + ((i + it) * 3) % 10;
      const discountPercent = i === 6 || i === 7 ? 5 : 0;
      const line = lineTotals({ quantity, rate: price.sell, serviceCharge: price.service, discountPercent, taxPercent: price.tax });
      builtItems.push({ skuId: skuIds[skuKey], skuKey, productName: price.name, room: ['Living Room', 'Master Bedroom', 'Kids Room', 'Guest Room'][(i + it) % 4], line });
    }

    const totals = {
      subtotal: r2(builtItems.reduce((s, x) => s + x.line.subtotal, 0)),
      discountAmount: r2(builtItems.reduce((s, x) => s + x.line.discountAmount, 0)),
      taxAmount: r2(builtItems.reduce((s, x) => s + x.line.taxAmount, 0)),
      totalAmount: r2(builtItems.reduce((s, x) => s + x.line.amount, 0)),
    };

    const versionCount = i < 3 ? 2 : 1;
    let acceptedVersionId: number | null = null;
    for (let v = 1; v <= versionCount; v++) {
      const isRevision = v === 2;
      const versionTotal = isRevision ? r2(totals.totalAmount * 0.94) : totals.totalAmount;
      const advance = status === 'ACCEPTED' && !isRevision ? r2(versionTotal * 0.3) : 0;
      const version = await prisma.quotationVersion.create({
        data: {
          quotationId: quotation.id,
          versionNumber: v,
          versionLabel: isRevision ? 'R1' : 'ORIGINAL',
          validityDate: d(30 - i * 3, 18),
          subtotal: isRevision ? r2(totals.subtotal * 0.94) : totals.subtotal,
          discountAmount: isRevision ? r2(totals.discountAmount + versionTotal * 0.06) : totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: versionTotal,
          advanceAmount: advance,
          balanceAmount: r2(versionTotal - advance),
          notes: isRevision ? 'Revised after customer negotiation' : 'Initial quotation shared with customer',
          changeReason: isRevision ? 'Customer requested 6% discount on bulk order' : null,
          status: isRevision ? 'ACCEPTED' : status === 'ACCEPTED' ? 'SUPERSEDED' : status,
          createdById: users.sales,
          approvedById: status === 'ACCEPTED' ? users.orderManager : null,
          approvedAt: status === 'ACCEPTED' ? d(40 - i * 4, 15) : null,
          createdAt: d(55 - i * 4 - (isRevision ? 0 : 2)),
        },
      });
      for (const bi of builtItems) {
        await prisma.quotationItem.create({
          data: {
            quotationVersionId: version.id,
            skuId: bi.skuId,
            room: bi.room,
            productName: bi.productName,
            quantity: bi.line.quantity,
            rate: bi.line.rate,
            serviceCharge: bi.line.serviceCharge,
            discountPercent: bi.line.discountPercent,
            discountAmount: bi.line.discountAmount,
            taxPercent: bi.line.taxPercent,
            taxAmount: bi.line.taxAmount,
            amount: bi.line.amount,
            notes: 'Rate valid for 30 days',
          },
        });
      }
      if (isRevision) acceptedVersionId = version.id;
      if (versionCount === 1 && status === 'ACCEPTED') acceptedVersionId = version.id;
    }
    if (acceptedVersionId) {
      await prisma.quotation.update({ where: { id: quotation.id }, data: { acceptedVersionId } });
    }
    versionItems.push(builtItems);
  }

  // ---- Orders ----
  const orders: OrderSeedInfo[] = [];
  const orderPlan = ORDER_STATUSES.map((status, i) => ({ status, index: i }));

  for (let i = 0; i < orderPlan.length; i++) {
    const { status } = orderPlan[i];
    const fromQuotation = i < 8;
    let customerId: number;
    let siteId: number;
    let items: Array<{ skuId: number; skuKey: string; productName: string; room: string; line: ReturnType<typeof lineTotals> }>;

    if (fromQuotation) {
      customerId = ctx.enquiryCustomer[i];
      siteId = ctx.enquirySite[i];
      items = versionItems[i];
    } else {
      const eIdx = i === 8 ? 9 : 10;
      customerId = ctx.enquiryCustomer[eIdx];
      siteId = ctx.enquirySite[eIdx];
      const skuKey = SKU_KEYS[(i * 3) % SKU_KEYS.length];
      const price = skuPrices[skuKey];
      const line = lineTotals({ quantity: 6, rate: price.sell, serviceCharge: price.service, taxPercent: price.tax });
      items = [{ skuId: skuIds[skuKey], skuKey, productName: price.name, room: 'Living Room', line }];
    }

    const subtotal = r2(items.reduce((s, x) => s + x.line.subtotal, 0));
    const discountAmount = r2(items.reduce((s, x) => s + x.line.discountAmount, 0));
    const taxAmount = r2(items.reduce((s, x) => s + x.line.taxAmount, 0));
    const totalAmount = r2(items.reduce((s, x) => s + x.line.amount, 0));
    const paid = r2(totalAmount * PAID_FRACTION[i]);
    const paymentStatus = paid >= totalAmount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING';
    const deliveryStatus = ['COMPLETED', 'DELIVERED', 'COMPLETED'].includes(status) ? 'DELIVERED' : status === 'INSTALLATION_IN_PROGRESS' ? 'PARTIAL' : 'PENDING';
    const advance = paid >= totalAmount * 0.3 ? r2(totalAmount * 0.3) : paid;

    const order = await prisma.order.create({
      data: {
        businessId: `ORD-${1001 + i}`,
        customerId,
        quotationId: fromQuotation ? quotationIds[i] : null,
        siteId,
        orderDate: d(45 - i * 3),
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        advanceAmount: advance,
        balanceAmount: r2(totalAmount - advance),
        status,
        paymentStatus,
        deliveryStatus,
        createdById: users.orderManager,
        notes: status === 'QC_FAILED' ? 'One curtain panel failed QC, rework in progress' : 'Order confirmed with customer',
      },
    });

    const itemInfos = [];
    for (const it of items) {
      const created = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          skuId: it.skuId,
          room: it.room,
          productName: it.productName,
          quantity: it.line.quantity,
          rate: it.line.rate,
          serviceCharge: it.line.serviceCharge,
          discountPercent: it.line.discountPercent,
          discountAmount: it.line.discountAmount,
          taxPercent: it.line.taxPercent,
          taxAmount: it.line.taxAmount,
          amount: it.line.amount,
          status: itemStatusFor(status),
          notes: 'Fabric and stitching as per approved sample',
        },
      });
      itemInfos.push({ id: created.id, skuId: it.skuId, skuKey: it.skuKey, productName: it.productName, quantity: Number(it.line.quantity), status: created.status });
    }

    const path = statusPath(status);
    let from: string | null = null;
    for (let p = 0; p < path.length; p++) {
      await prisma.orderStatusHistory.create({
        data: { orderId: order.id, fromStatus: from, toStatus: path[p], changedById: users.orderManager, reason: p === 0 ? 'Order created from accepted quotation' : 'Status advanced by operations', createdAt: d(45 - i * 3 - p, 10 + p) },
      });
      from = path[p];
    }

    // ---- Payments ----
    if (paid > 0) {
      const advancePortion = Math.min(advance, paid);
      if (advancePortion > 0) {
        await prisma.payment.create({
          data: {
            businessId: `PAY-${pad(orders.length * 3 + 1)}`,
            customerId, orderId: order.id, paymentType: 'ADVANCE', amount: r2(advancePortion),
            paymentMethod: ['UPI', 'BANK_TRANSFER', 'CASH', 'CARD'][i % 4], referenceNo: `TXN${100000 + i * 7}`,
            paymentDate: d(40 - i * 3), status: 'CONFIRMED', zohoReceiptId: `ZR-${2000 + i}`, zohoSynced: true,
            recordedById: users.finance, notes: 'Advance received against order',
          },
        });
      }
      const balancePortion = r2(paid - advancePortion);
      if (balancePortion > 0) {
        await prisma.payment.create({
          data: {
            businessId: `PAY-${pad(orders.length * 3 + 2)}`,
            customerId, orderId: order.id, paymentType: paymentStatus === 'PAID' ? 'FULL' : 'PARTIAL', amount: balancePortion,
            paymentMethod: ['UPI', 'CASH', 'BANK_TRANSFER', 'CHEQUE'][i % 4], referenceNo: `TXN${200000 + i * 5}`,
            paymentDate: d(20 - i, 11), status: i === 9 ? 'PENDING' : 'CONFIRMED', zohoSynced: i !== 9,
            recordedById: users.finance, notes: 'Balance payment received',
          },
        });
      }
    }

    orders.push({ id: order.id, businessId: order.businessId, customerId, siteId, total: totalAmount, advance, balance: r2(totalAmount - advance), status, items: itemInfos });
  }

  return { orders, quotationIds };
}

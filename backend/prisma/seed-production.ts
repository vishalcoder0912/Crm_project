// hello this is vishal project
import { PrismaClient } from '@prisma/client';
import { d, r2 } from './seed-helpers';
import type { OpsContext, SeedContext } from './seed-helpers';

const pad = (n: number, len = 4) => String(n).padStart(len, '0');

function tailoringStatusFor(orderStatus: string): string {
  switch (orderStatus) {
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PARTIALLY_DELIVERED':
    case 'INSTALLATION_IN_PROGRESS':
      return 'DISPATCHED';
    case 'INSTALLATION_SCHEDULED':
    case 'PACKED':
    case 'QC_PASSED':
      return 'COMPLETED';
    case 'TAILORING':
    case 'QC_FAILED':
      return 'IN_PRODUCTION';
    case 'MATERIAL_AVAILABLE':
      return 'ASSIGNED';
    default:
      return 'PENDING';
  }
}

function installationStatusFor(orderStatus: string): string {
  switch (orderStatus) {
    case 'COMPLETED':
    case 'DELIVERED':
      return 'COMPLETED';
    case 'INSTALLATION_IN_PROGRESS':
      return 'IN_PROGRESS';
    case 'INSTALLATION_SCHEDULED':
      return 'ASSIGNED';
    case 'PARTIALLY_DELIVERED':
      return 'DELAYED';
    default:
      return 'SCHEDULED';
  }
}

export async function seedProduction(prisma: PrismaClient, ctx: SeedContext, ops: OpsContext): Promise<void> {
  const { users, skuIds, skuPrices, vendorIds, fieldEmpIds, vehicleIds } = ctx;
  const orders = ops.orders;

  let stk = 0;
  let poNo = 0;
  let grnNo = 0;
  let tlrNo = 0;
  let qcNo = 0;
  let pkgNo = 0;
  let insNo = 0;
  let rszNo = 0;

  // ---- Stock Requests ----
  for (let i = 3; i <= 8 && i < orders.length; i++) {
    const order = orders[i];
    const reqCount = 1 + (i % 2);
    for (let r = 0; r < reqCount; r++) {
      stk += 1;
      const item = order.items[r % order.items.length];
      const orderQty = item.quantity + 2;
      const status = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED', 'COMPLETED'][(i + r) % 5];
      await prisma.stockRequest.create({
        data: {
          businessId: `STK-${pad(stk)}`,
          orderId: order.id,
          skuId: item.skuId,
          orderQty,
          requestedQty: orderQty,
          issuedQty: status === 'ISSUED' || status === 'COMPLETED' ? orderQty : 0,
          warehouse: 'MAIN',
          status,
          requestedById: users.warehouse,
          approvedById: ['APPROVED', 'ISSUED', 'COMPLETED'].includes(status) ? users.orderManager : null,
          approvedAt: ['APPROVED', 'ISSUED', 'COMPLETED'].includes(status) ? d(20 - i) : null,
          notes: `Material request for ${order.businessId}`,
        },
      });
    }
  }

  // ---- Purchase Orders + Goods Receipts ----
  const poPlan = [
    { vendorKey: 'fabrics', status: 'FULLY_RECEIVED' },
    { vendorKey: 'blinds', status: 'PARTIALLY_RECEIVED' },
    { vendorKey: 'rods', status: 'SENT' },
    { vendorKey: 'track', status: 'APPROVED' },
    { vendorKey: 'vinyl', status: 'DRAFT' },
  ];
  const skuKeys = Object.keys(skuIds);
  for (let p = 0; p < poPlan.length; p++) {
    poNo += 1;
    const plan = poPlan[p];
    const itemCount = 2 + (p % 2);
    const rows: Array<{ skuId: number; skuKey: string; quantity: number; rate: number }> = [];
    for (let it = 0; it < itemCount; it++) {
      const skuKey = skuKeys[(p * 3 + it) % skuKeys.length];
      const price = skuPrices[skuKey];
      rows.push({ skuId: skuIds[skuKey], skuKey, quantity: 20 + ((p + it) * 5) % 40, rate: price.cost });
    }
    const totalAmount = r2(rows.reduce((s, x) => s + x.quantity * x.rate, 0));
    const po = await prisma.purchaseOrder.create({
      data: {
        businessId: `PO-${pad(poNo)}`,
        vendorId: vendorIds[plan.vendorKey],
        totalAmount,
        expectedDelivery: d(-(3 + p * 2)),
        terms: 'Goods to be inspected on receipt. Payment as per vendor terms.',
        status: plan.status,
        portalRequired: p === 1,
        portalReference: p === 1 ? `PORTAL-${100 + p}` : null,
        portalStatus: p === 1 ? 'ACKNOWLEDGED' : null,
        createdById: users.procurement,
        approvedById: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].includes(plan.status) ? users.admin : null,
        approvedAt: ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].includes(plan.status) ? d(35 - p * 2) : null,
        sentAt: ['SENT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED'].includes(plan.status) ? d(33 - p * 2) : null,
        notes: 'Procurement for confirmed orders',
      },
    });
    const poItems = [];
    for (const row of rows) {
      const created = await prisma.purchaseOrderItem.create({
        data: { poId: po.id, skuId: row.skuId, quantity: row.quantity, rate: row.rate, amount: r2(row.quantity * row.rate), receivedQty: 0, notes: 'Deliver to main warehouse' },
      });
      poItems.push({ id: created.id, ...row });
    }

    if (plan.status === 'FULLY_RECEIVED' || plan.status === 'PARTIALLY_RECEIVED') {
      grnNo += 1;
      const fully = plan.status === 'FULLY_RECEIVED';
      const grn = await prisma.goodsReceipt.create({
        data: {
          businessId: `GRN-${pad(grnNo)}`,
          poId: po.id,
          vendorId: vendorIds[plan.vendorKey],
          receivedDate: d(12 - p * 3),
          verifiedById: users.warehouse,
          notes: fully ? 'All items received in good condition' : 'Partial shipment, balance awaited',
        },
      });
      for (const it of poItems) {
        const receivedQty = fully ? it.quantity : Math.floor(it.quantity * 0.6);
        const shortQty = it.quantity - receivedQty;
        await prisma.goodsReceiptItem.create({
          data: { grnId: grn.id, skuId: it.skuId, orderedQty: it.quantity, receivedQty, shortQty, condition: shortQty > 0 ? 'PARTIAL_DAMAGE' : 'GOOD', notes: shortQty > 0 ? 'Balance expected in next lot' : 'Verified' },
        });
        await prisma.purchaseOrderItem.update({ where: { id: it.id }, data: { receivedQty } });
        const stock = await prisma.stock.findFirst({ where: { skuId: it.skuId, warehouse: 'MAIN' } });
        if (stock) {
          await prisma.stock.update({ where: { id: stock.id }, data: { availableQty: Number(stock.availableQty) + receivedQty } });
        }
      }
    }
  }

  // ---- Tailoring Orders ----
  const tailoringRecords: Array<{ id: number; orderItemId: number; status: string }> = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (order.status === 'PROCUREMENT_PENDING' || order.status === 'CONFIRMED') continue;
    for (const item of order.items) {
      tlrNo += 1;
      const status = tailoringStatusFor(order.status);
      const created = await prisma.tailoringOrder.create({
        data: {
          businessId: `TLR-${pad(tlrNo)}`,
          orderId: order.id,
          orderItemId: item.id,
          skuId: item.skuId,
          fabric: ['Premium Polyester', 'Cotton Blend', 'Sheer Voile', 'Linen Mix'][tlrNo % 4],
          quantity: item.quantity,
          room: ['Living Room', 'Master Bedroom', 'Kids Room', 'Guest Room'][tlrNo % 4],
          requiredOutput: 'Stitched curtain panels with 4 inch bottom hem',
          measurements: 'As per measurement sheet; rod-to-rod with 2 inch overlap',
          assignedToId: users.tailoring,
          status,
          startedAt: status !== 'PENDING' && status !== 'ASSIGNED' ? d(25 - i) : null,
          completedAt: status === 'COMPLETED' || status === 'DISPATCHED' ? d(18 - i) : null,
          dispatchedAt: status === 'DISPATCHED' ? d(15 - i) : null,
          notes: 'Handle fabric with care',
        },
      });
      tailoringRecords.push({ id: created.id, orderItemId: item.id, status });
    }
  }

  // ---- QC Inspections ----
  for (let t = 0; t < tailoringRecords.length; t++) {
    const rec = tailoringRecords[t];
    if (rec.status !== 'COMPLETED' && rec.status !== 'DISPATCHED') continue;
    qcNo += 1;
    const fail = t === tailoringRecords.length - 2;
    await prisma.qCInspection.create({
      data: {
        businessId: `QC-${pad(qcNo)}`,
        tailoringOrderId: rec.id,
        orderItemId: rec.orderItemId,
        productCorrect: true,
        quantityCorrect: true,
        measurementCorrect: !fail,
        fabricCorrect: true,
        stitchingCorrect: !fail,
        finishingOk: true,
        result: fail ? 'FAIL' : 'PASS',
        failReason: fail ? 'Panel width 3 inches short and hem stitching uneven' : null,
        inspectedById: users.qc,
        inspectedAt: d(14 - (t % 10)),
        notes: fail ? 'Sent back to tailoring for rework' : 'All checks passed, ready for packing',
      },
    });
  }

  // ---- Packing Slips ----
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    if (!['INSTALLATION_SCHEDULED', 'PACKED', 'DELIVERED', 'COMPLETED', 'PARTIALLY_DELIVERED'].includes(order.status)) continue;
    pkgNo += 1;
    const totalPackets = 1 + (i % 2);
    const slip = await prisma.packingSlip.create({
      data: {
        businessId: `PKG-${pad(pkgNo)}`,
        customerId: order.customerId,
        orderId: order.id,
        totalPackets,
        preparedById: users.warehouse,
        preparedAt: d(10 - i),
        notes: 'Packed with hardware kit and installation guide',
      },
    });
    for (let pk = 1; pk <= totalPackets; pk++) {
      const packet = await prisma.packet.create({ data: { packingSlipId: slip.id, packetNumber: pk, notes: `Packet ${pk} of ${totalPackets}` } });
      const item = order.items[(pk - 1) % order.items.length];
      await prisma.packetItem.create({ data: { packetId: packet.id, orderItemId: item.id, quantity: item.quantity, notes: 'Includes rod, brackets and rings' } });
    }
  }

  // ---- Installations + Field Tracking + Vehicle Trips ----
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const status = installationStatusFor(order.status);
    if (status === 'SCHEDULED' && order.status !== 'INSTALLATION_SCHEDULED') continue;
    if (!['COMPLETED', 'DELIVERED', 'INSTALLATION_SCHEDULED', 'INSTALLATION_IN_PROGRESS', 'PARTIALLY_DELIVERED'].includes(order.status)) continue;
    insNo += 1;
    const vehicleId = vehicleIds[i % vehicleIds.length];
    const installation = await prisma.installation.create({
      data: {
        businessId: `INS-${pad(insNo)}`,
        customerId: order.customerId,
        orderId: order.id,
        siteId: order.siteId,
        scheduledDate: d(8 - i),
        scheduledTime: `${9 + (i % 6)}:00`,
        vehicleId,
        status,
        notes: status === 'DELAYED' ? 'Customer requested reschedule' : 'Call customer 30 mins before arrival',
        completedAt: status === 'COMPLETED' ? d(5 - i) : null,
      },
    });
    const team = [fieldEmpIds[i % fieldEmpIds.length], fieldEmpIds[(i + 2) % fieldEmpIds.length]];
    for (const empId of team) {
      await prisma.installationEmployee.create({ data: { installationId: installation.id, fieldEmployeeId: empId } });
      const started = status === 'IN_PROGRESS' || status === 'COMPLETED';
      const done = status === 'COMPLETED';
      await prisma.fieldEmployeeTracking.create({
        data: {
          installationId: installation.id,
          fieldEmployeeId: empId,
          scheduledTime: d(8 - i, 9),
          checkInTime: started ? d(8 - i, 9) : null,
          arrivalTime: started ? d(8 - i, 10) : null,
          startTime: started ? d(8 - i, 10) : null,
          completionTime: done ? d(8 - i, 15) : null,
          checkOutTime: done ? d(8 - i, 16) : null,
          notes: done ? 'Installation completed and customer sign-off taken' : 'On site',
        },
      });
    }
    await prisma.vehicleTrip.create({
      data: {
        vehicleId,
        fieldEmployeeId: team[0],
        purpose: `Installation for ${order.businessId}`,
        taskType: 'INSTALLATION',
        taskId: installation.id,
        startKm: 10000 + i * 250,
        endKm: status === 'COMPLETED' ? 10000 + i * 250 + 38 : null,
        startTime: d(8 - i, 8),
        endTime: status === 'COMPLETED' ? d(8 - i, 18) : null,
        notes: 'Warehouse to customer site and back',
      },
    });
  }

  // ---- Resizing Requests ----
  const resizableOrders = orders.filter((o) => o.items.length > 0).slice(4, 6);
  for (let i = 0; i < resizableOrders.length; i++) {
    rszNo += 1;
    const order = resizableOrders[i];
    const item = order.items[0];
    await prisma.resizingRequest.create({
      data: {
        businessId: `RSZ-${pad(rszNo)}`,
        orderId: order.id,
        orderItemId: item.id,
        originalWidth: 48 + i * 6,
        originalHeight: 84,
        requiredWidth: 51 + i * 6,
        requiredHeight: 84,
        reason: i === 0 ? 'WRONG_MEASUREMENT' : 'CUSTOMER_CHANGED',
        reasonDetail: i === 0 ? 'Original measurement missed 2 inch overlap' : 'Customer wants wider panels after installation',
        status: ['CREATED', 'TAILORING', 'COMPLETED'][i % 3],
        createdById: users.orderManager,
      },
    });
  }

  // ---- Notifications ----
  const notificationSeeds = [
    { key: 'admin', type: 'QC_FAILED', title: 'QC failed for ORD-1009', message: 'A curtain panel failed QC and has been sent for rework.', entityType: 'order', entityId: orders[8]?.id },
    { key: 'sales', type: 'PAYMENT_RECEIVED', title: 'Payment received', message: 'Advance payment received for ORD-1003.', entityType: 'order', entityId: orders[2]?.id },
    { key: 'orderManager', type: 'MEASUREMENT_PENDING', title: 'Measurement pending', message: '3 measurements are awaiting scheduling.', entityType: 'measurement', entityId: null },
    { key: 'warehouse', type: 'LOW_STOCK', title: 'Low stock alert', message: 'Motorized Curtain Track stock is below reorder level.', entityType: 'sku', entityId: null },
    { key: 'procurement', type: 'PO_APPROVAL', title: 'PO awaiting approval', message: 'Purchase Order PO-0004 needs approval.', entityType: 'purchase_order', entityId: null },
    { key: 'tailoring', type: 'TAILORING_ASSIGNED', title: 'New tailoring job', message: 'A new tailoring order has been assigned to you.', entityType: 'tailoring_order', entityId: null },
    { key: 'installation', type: 'INSTALLATION_SCHEDULED', title: 'Installation tomorrow', message: 'Installation for ORD-1002 is scheduled tomorrow at 09:00.', entityType: 'installation', entityId: null },
    { key: 'finance', type: 'PAYMENT_PENDING', title: 'Balance payment pending', message: 'ORD-1002 has a pending balance payment.', entityType: 'order', entityId: orders[1]?.id },
  ];
  for (let i = 0; i < notificationSeeds.length; i++) {
    const n = notificationSeeds[i];
    await prisma.notification.create({
      data: { userId: users[n.key], type: n.type, title: n.title, message: n.message, entityType: n.entityType ?? null, entityId: n.entityId ?? null, isRead: i % 3 === 0, createdAt: d(6 - (i % 6), 9 + (i % 8)) },
    });
  }

  // ---- Communications ----
  const commSeeds = [
    { type: 'WHATSAPP', direction: 'OUTBOUND', subject: 'Quotation shared', message: 'Shared the quotation PDF on WhatsApp.', status: 'READ' },
    { type: 'CALL', direction: 'INBOUND', subject: 'Measurement follow-up', message: 'Customer called to confirm measurement slot.', status: 'DELIVERED' },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Order confirmation', message: 'Order confirmation and invoice sent via email.', status: 'DELIVERED' },
    { type: 'SMS', direction: 'OUTBOUND', subject: 'Installation reminder', message: 'Reminder: installation scheduled tomorrow at 9 AM.', status: 'SENT' },
    { type: 'WHATSAPP', direction: 'INBOUND', subject: 'Fabric selection', message: 'Customer shared reference images for fabric selection.', status: 'READ' },
    { type: 'NOTE', direction: 'OUTBOUND', subject: 'Internal note', message: 'Customer prefers matte finish rods.', status: null },
    { type: 'EMAIL', direction: 'OUTBOUND', subject: 'Payment link', message: 'Payment link shared for balance amount.', status: 'DELIVERED' },
    { type: 'CALL', direction: 'OUTBOUND', subject: 'QC update', message: 'Informed customer about rework timeline.', status: 'DELIVERED' },
  ];
  for (let i = 0; i < commSeeds.length; i++) {
    const c = commSeeds[i];
    const custId = ctx.customerIds[i % ctx.customerIds.length];
    const order = orders[i % orders.length];
    await prisma.communication.create({
      data: {
        customerId: custId,
        orderId: order.id,
        type: c.type,
        direction: c.direction,
        subject: c.subject,
        message: c.message,
        senderId: users.sales,
        deliveryStatus: c.status,
        relatedEntity: 'order',
        relatedEntityId: order.id,
        createdAt: d(30 - i * 2, 10 + (i % 6)),
      },
    });
  }

  // ---- Audit Logs ----
  const auditSeeds = [
    { action: 'CREATE', entityType: 'customer', reason: 'New customer onboarded' },
    { action: 'CREATE', entityType: 'enquiry', reason: 'Enquiry captured at store' },
    { action: 'STATUS_CHANGE', entityType: 'enquiry', reason: 'Marked as WON' },
    { action: 'PRICE_CHANGE', entityType: 'sku', reason: 'Vendor rate revision applied' },
    { action: 'CREATE', entityType: 'quotation', reason: 'Quotation generated' },
    { action: 'APPROVE', entityType: 'quotation', reason: 'Quotation approved by manager' },
    { action: 'CREATE', entityType: 'order', reason: 'Order confirmed' },
    { action: 'APPROVE', entityType: 'stock_request', reason: 'Stock request approved' },
    { action: 'CREATE', entityType: 'purchase_order', reason: 'PO raised to vendor' },
    { action: 'CREATE', entityType: 'goods_receipt', reason: 'Goods received and verified' },
    { action: 'CREATE', entityType: 'tailoring_order', reason: 'Tailoring job assigned' },
    { action: 'CREATE', entityType: 'qc_inspection', reason: 'QC inspection recorded' },
    { action: 'CREATE', entityType: 'packing_slip', reason: 'Order packed' },
    { action: 'CREATE', entityType: 'installation', reason: 'Installation scheduled' },
    { action: 'CREATE', entityType: 'payment', reason: 'Payment recorded' },
    { action: 'LOGIN', entityType: 'user', reason: 'User logged in' },
  ];
  for (let i = 0; i < auditSeeds.length; i++) {
    const a = auditSeeds[i];
    await prisma.auditLog.create({
      data: {
        userId: users.admin,
        userEmail: 'admin@furnishops.com',
        action: a.action,
        entityType: a.entityType,
        entityId: String(1000 + i),
        oldValue: a.action === 'PRICE_CHANGE' ? JSON.stringify({ sellingPrice: 320 }) : null,
        newValue: a.action === 'PRICE_CHANGE' ? JSON.stringify({ sellingPrice: 340 }) : null,
        ipAddress: '127.0.0.1',
        reason: a.reason,
        createdAt: d(45 - i * 2, 9 + (i % 8)),
      },
    });
  }
}

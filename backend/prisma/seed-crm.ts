// hello this is vishal project
import { PrismaClient } from '@prisma/client';
import { d } from './seed-helpers';
import type { SeedContext, OpsContext } from './seed-helpers';

const pad = (n: number, len = 4) => String(n).padStart(len, '0');

const PURPOSES = [
  'Quotation follow-up',
  'Measurement confirmation',
  'Price negotiation',
  'Payment reminder',
  'Installation confirmation',
  'Requotation discussion',
  'General enquiry follow-up',
];

const CHANNELS = ['CALL', 'WHATSAPP', 'EMAIL', 'VISIT'];

// pattern -> { daysAgo, status }
const PATTERN: Array<{ daysAgo: number; status: string }> = [
  { daysAgo: 6, status: 'PENDING' },
  { daysAgo: 5, status: 'PENDING' },
  { daysAgo: 3, status: 'COMPLETED' },
  { daysAgo: 4, status: 'CANCELLED' },
  { daysAgo: 1, status: 'COMPLETED' },
  { daysAgo: 0, status: 'PENDING' },
  { daysAgo: 0, status: 'PENDING' },
  { daysAgo: -1, status: 'PENDING' },
  { daysAgo: -4, status: 'PENDING' },
  { daysAgo: -10, status: 'PENDING' },
];

const PRIORITY = ['HIGH', 'MEDIUM', 'LOW'];

export async function seedCrm(
  prisma: PrismaClient,
  core: SeedContext,
  ops: OpsContext
): Promise<void> {
  const total = 42;
  for (let i = 0; i < total; i++) {
    const custIdx = i % core.customerIds.length;
    const customerId = core.customerIds[custIdx];
    const pattern = PATTERN[i % PATTERN.length];

    const enqIdx = core.enquiryCustomer.findIndex((c) => c === customerId);
    const order = ops.orders.find((o) => o.customerId === customerId);

    const assignedTo =
      order?.id !== undefined
        ? core.users[i % 2 === 0 ? 'sales' : 'orderManager']
        : core.users.sales;

    const dueAt = d(pattern.daysAgo, 9 + (i % 8));
    const completedAt = pattern.status === 'COMPLETED' ? d(Math.max(pattern.daysAgo, 0), 15) : null;

    await prisma.followUp.create({
      data: {
        businessId: `FUP-${pad(i + 1)}`,
        customerId,
        enquiryId: enqIdx >= 0 ? core.enquiryIds[enqIdx] : null,
        orderId: order?.id ?? null,
        branchId: core.customerBranch[custIdx],
        purpose: PURPOSES[i % PURPOSES.length],
        channel: CHANNELS[i % CHANNELS.length],
        dueAt,
        priority: PRIORITY[i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2],
        status: pattern.status,
        assignedToId: assignedTo,
        createdById: core.users.admin,
        notes:
          pattern.status === 'COMPLETED'
            ? 'Spoke to customer, confirmed next step.'
            : pattern.status === 'CANCELLED'
              ? 'Customer asked to drop this follow-up.'
              : 'Reminder scheduled — awaiting response.',
        completedAt,
        createdAt: d(pattern.daysAgo + 3, 10),
      },
    });
  }
}

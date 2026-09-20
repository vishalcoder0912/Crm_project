import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../src/config/constants';
import { seedCore, wipeBusinessData } from './seed-core';
import { seedSales } from './seed-sales';
import { seedProduction } from './seed-production';
import { seedCrm } from './seed-crm';

const prisma = new PrismaClient();

async function seedPermissions(): Promise<void> {
  for (const [code, description] of Object.entries(PERMISSIONS)) {
    const [module, ...actionParts] = code.split('.');
    const action = actionParts.join('.');
    await prisma.permission.upsert({
      where: { code },
      update: { module, action, description },
      create: { code, module, action, description },
    });
  }
}

async function seedRoles(): Promise<void> {
  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { displayName: roleName },
      create: {
        name: roleName,
        displayName: roleName,
        isSystem: roleName === 'Admin',
      },
    });

    for (const code of permissionCodes) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) continue;

      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }
}

async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  businessId: string,
  roleName: string
): Promise<number> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(`Role not found: ${roleName}`);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, firstName, lastName, businessId, roleId: role.id, isActive: true },
    create: {
      email,
      passwordHash,
      firstName,
      lastName,
      businessId,
      roleId: role.id,
    },
  });
  return user.id;
}

const USER_SEEDS = [
  { key: 'admin', email: 'admin@furnishops.com', password: 'Admin@123', firstName: 'System', lastName: 'Admin', businessId: 'USR-0001', role: 'Admin' },
  { key: 'sales', email: 'sales@furnishops.com', password: 'Sales@123', firstName: 'Sales', lastName: 'Executive', businessId: 'USR-0002', role: 'Sales / Enquiry User' },
  { key: 'orderManager', email: 'orders@furnishops.com', password: 'Orders@123', firstName: 'Order', lastName: 'Manager', businessId: 'USR-0003', role: 'Order Manager' },
  { key: 'measurement', email: 'measurement@furnishops.com', password: 'Measure@123', firstName: 'Measurement', lastName: 'Lead', businessId: 'USR-0004', role: 'Measurement Team' },
  { key: 'warehouse', email: 'warehouse@furnishops.com', password: 'Warehouse@123', firstName: 'Warehouse', lastName: 'Keeper', businessId: 'USR-0005', role: 'Warehouse User' },
  { key: 'procurement', email: 'procurement@furnishops.com', password: 'Purchase@123', firstName: 'Procurement', lastName: 'Officer', businessId: 'USR-0006', role: 'Procurement User' },
  { key: 'tailoring', email: 'tailoring@furnishops.com', password: 'Tailor@123', firstName: 'Tailoring', lastName: 'Supervisor', businessId: 'USR-0007', role: 'Tailoring User' },
  { key: 'qc', email: 'qc@furnishops.com', password: 'Qc@12345', firstName: 'QC', lastName: 'Inspector', businessId: 'USR-0008', role: 'QC User' },
  { key: 'installation', email: 'field@furnishops.com', password: 'Field@123', firstName: 'Field', lastName: 'Team Lead', businessId: 'USR-0009', role: 'Installation / Field Team' },
  { key: 'finance', email: 'finance@furnishops.com', password: 'Finance@123', firstName: 'Finance', lastName: 'Officer', businessId: 'USR-0010', role: 'Finance User' },
];

async function main(): Promise<void> {
  await seedPermissions();
  await seedRoles();

  const users: Record<string, number> = {};
  for (const seed of USER_SEEDS) {
    users[seed.key] = await createUser(seed.email, seed.password, seed.firstName, seed.lastName, seed.businessId, seed.role);
  }

  console.log('Wiping existing business data...');
  await wipeBusinessData(prisma);

  console.log('Seeding core masters (vendors, products, SKUs, stock, customers, enquiries, measurements)...');
  const core = await seedCore(prisma, users);

  console.log('Seeding sales (quotations, orders, payments)...');
  const ops = await seedSales(prisma, core);

  console.log('Seeding operations (stock, procurement, tailoring, QC, packing, installations)...');
  await seedProduction(prisma, core, ops);

  console.log('Seeding CRM (follow-ups)...');
  await seedCrm(prisma, core, ops);

  const counts = {
    users: await prisma.user.count(),
    roles: await prisma.role.count(),
    permissions: await prisma.permission.count(),
    vendors: await prisma.vendor.count(),
    products: await prisma.product.count(),
    skus: await prisma.sKU.count(),
    stock: await prisma.stock.count(),
    branches: await prisma.branch.count(),
    customers: await prisma.customer.count(),
    sites: await prisma.site.count(),
    followUps: await prisma.followUp.count(),
    enquiries: await prisma.enquiry.count(),
    measurements: await prisma.measurement.count(),
    quotations: await prisma.quotation.count(),
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    stockRequests: await prisma.stockRequest.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    goodsReceipts: await prisma.goodsReceipt.count(),
    tailoringOrders: await prisma.tailoringOrder.count(),
    qcInspections: await prisma.qCInspection.count(),
    packingSlips: await prisma.packingSlip.count(),
    installations: await prisma.installation.count(),
    resizingRequests: await prisma.resizingRequest.count(),
    fieldEmployees: await prisma.fieldEmployee.count(),
    vehicles: await prisma.vehicle.count(),
    notifications: await prisma.notification.count(),
    communications: await prisma.communication.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('Seed completed successfully:');
  console.table(counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
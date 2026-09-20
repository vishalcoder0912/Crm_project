// hello this is vishal project
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

const client = Object.assign(prisma, {
  sku: prisma.sKU,
  qcInspection: prisma.qCInspection,
});

export default client;
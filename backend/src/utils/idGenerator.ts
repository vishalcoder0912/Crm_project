import prisma from '../config/database';
import { BUSINESS_ID_PREFIXES } from '../config/constants';

/**
 * Generate a human-readable business ID like CUS-0001, ORD-1001
 * Uses the max existing ID in the table + 1
 */
export async function generateBusinessId(entityType: string, tableName: string): Promise<string> {
  const prefix = BUSINESS_ID_PREFIXES[entityType];
  if (!prefix) {
    throw new Error(`No business ID prefix defined for entity: ${entityType}`);
  }

  // Query the max business ID for this entity
  const result = await prisma.$queryRawUnsafe<{ max_id: string | null }[]>(
    `SELECT MAX("businessId") as max_id FROM "${tableName}" WHERE "businessId" LIKE '${prefix}-%'`
  );

  let nextNum = 1;
  if (result[0]?.max_id) {
    const currentNum = parseInt(result[0].max_id.split('-')[1], 10);
    nextNum = currentNum + 1;
  }

  // Orders start from 1001
  if (entityType === 'order' && nextNum < 1001) {
    nextNum = 1001;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

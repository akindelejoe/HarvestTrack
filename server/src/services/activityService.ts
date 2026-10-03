import type { ActivityType, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';

type Client = Prisma.TransactionClient | typeof prisma;

export function logActivity(plantingId: string, type: ActivityType, description: string, db: Client = prisma) {
  return db.plantingActivity.create({ data: { plantingId, type, description } });
}

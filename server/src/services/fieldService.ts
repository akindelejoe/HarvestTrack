import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';
import { farmService } from './farmService.js';

export const fieldService = {
  list(userId: string, farmId?: string) {
    return prisma.field.findMany({
      where: { farm: { userId }, ...(farmId && { farmId }) },
      orderBy: [{ farm: { name: 'asc' } }, { name: 'asc' }],
      include: { farm: { select: { id: true, name: true } }, _count: { select: { plantings: { where: { status: 'ACTIVE' } } } } },
    });
  },

  /** Ownership guard via the parent farm. */
  async getOwned(userId: string, fieldId: string) {
    const field = await prisma.field.findFirst({ where: { id: fieldId, farm: { userId } }, include: { farm: true } });
    if (!field) throw AppError.notFound('Field');
    return field;
  },

  async create(userId: string, input: { farmId: string; name: string; areaAcres?: number | null; soilType?: string | null }) {
    await farmService.getOwned(userId, input.farmId);
    return prisma.field.create({ data: input });
  },

  async update(userId: string, fieldId: string, input: { name?: string; areaAcres?: number | null; soilType?: string | null }) {
    await this.getOwned(userId, fieldId);
    return prisma.field.update({ where: { id: fieldId }, data: input });
  },

  async remove(userId: string, fieldId: string) {
    await this.getOwned(userId, fieldId);
    await prisma.field.delete({ where: { id: fieldId } });
  },
};

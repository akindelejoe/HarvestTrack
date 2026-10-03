import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';
import { geocode } from './geocodingService.js';

export const farmService = {
  list(userId: string) {
    return prisma.farm.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        fields: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { plantings: { where: { status: 'ACTIVE' } } } } },
        },
      },
    });
  },

  /** Ownership guard: returns the farm only if it belongs to the user. */
  async getOwned(userId: string, farmId: string) {
    const farm = await prisma.farm.findFirst({ where: { id: farmId, userId } });
    if (!farm) throw AppError.notFound('Farm');
    return farm;
  },

  async create(userId: string, input: { name: string; location: string; latitude?: number; longitude?: number }) {
    const point =
      input.latitude !== undefined && input.longitude !== undefined
        ? { latitude: input.latitude, longitude: input.longitude }
        : await geocode(input.location);

    return prisma.farm.create({
      data: { userId, name: input.name, location: input.location, latitude: point.latitude, longitude: point.longitude },
    });
  },

  async update(userId: string, farmId: string, input: { name: string; location: string; latitude?: number; longitude?: number }) {
    const farm = await this.getOwned(userId, farmId);
    let coords = { latitude: Number(farm.latitude), longitude: Number(farm.longitude) };
    if (input.latitude !== undefined && input.longitude !== undefined) {
      coords = { latitude: input.latitude, longitude: input.longitude };
    } else if (input.location !== farm.location) {
      coords = await geocode(input.location);
    }
    const locationChanged = coords.latitude !== Number(farm.latitude) || coords.longitude !== Number(farm.longitude);
    return prisma.$transaction(async (tx) => {
      if (locationChanged) await tx.weatherSnapshot.deleteMany({ where: { farmId } });
      return tx.farm.update({ where: { id: farmId }, data: { name: input.name, location: input.location, ...coords } });
    });
  },

  async remove(userId: string, farmId: string) {
    await this.getOwned(userId, farmId);
    await prisma.farm.delete({ where: { id: farmId } });
  },
};

import { prisma } from '../database/prisma.js';

export const cropTypeService = {
  async list() {
    const types = await prisma.cropType.findMany({ orderBy: { name: 'asc' } });
    return types.map((t) => ({
      id: t.id,
      name: t.name,
      minDaysToHarvest: t.minDaysToHarvest,
      maxDaysToHarvest: t.maxDaysToHarvest,
      idealTempMinC: Number(t.idealTempMinC),
      idealTempMaxC: Number(t.idealTempMaxC),
      frostSensitive: t.frostSensitive,
      excessRainSensitive: t.excessRainSensitive,
      droughtSensitive: t.droughtSensitive,
      windSensitive: t.windSensitive,
      notes: t.notes,
    }));
  },
};

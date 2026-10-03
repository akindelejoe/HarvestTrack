import type { PlantingStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';
import { toDateOnly } from '../utils/dates.js';
import { logger } from '../utils/logger.js';
import { logActivity } from './activityService.js';
import { alertService } from './alertService.js';
import { farmService } from './farmService.js';
import { fieldService } from './fieldService.js';
import { estimateHarvestWindow } from './harvestEstimationService.js';
import { plantingInclude, presentHarvest, presentPlanting } from './plantingPresenter.js';

interface CreatePlantingInput {
  cropTypeId: string;
  farmId: string;
  fieldId?: string;
  newFieldName?: string;
  variety: string | null;
  plantingDate: Date;
  plotLocation: string | null;
  notes: string | null;
}

interface UpdatePlantingInput {
  cropTypeId?: string;
  fieldId?: string;
  variety?: string | null;
  plantingDate?: Date;
  plotLocation?: string | null;
  notes?: string | null;
  status?: 'ACTIVE' | 'FAILED';
}

async function getCropType(id: string) {
  const crop = await prisma.cropType.findUnique({ where: { id } });
  if (!crop) throw AppError.badRequest('Selected crop type does not exist.');
  return crop;
}

async function getOwnedPlanting(userId: string, id: string) {
  const planting = await prisma.planting.findFirst({
    where: { id, field: { farm: { userId } } },
    include: plantingInclude(),
  });
  if (!planting) throw AppError.notFound('Planting');
  return planting;
}

/** Fire-and-forget hazard scan so new plantings get weather alerts without slowing the request. */
function scanInBackground(userId: string) {
  alertService.scan(userId).catch((err) => logger.warn('alerts', 'Background scan failed', { error: (err as Error).message }));
}

export const plantingService = {
  async list(userId: string, q: { status: PlantingStatus | 'ALL'; farmId?: string; fieldId?: string }) {
    const where: Prisma.PlantingWhereInput = {
      field: { farm: { userId }, ...(q.farmId && { farmId: q.farmId }) },
      ...(q.fieldId && { fieldId: q.fieldId }),
      ...(q.status !== 'ALL' && { status: q.status }),
    };
    const plantings = await prisma.planting.findMany({
      where,
      include: plantingInclude(),
      orderBy: [{ estimatedHarvestStart: 'asc' }],
    });
    return plantings.map((p) => presentPlanting(p));
  },

  async get(userId: string, id: string) {
    const planting = await getOwnedPlanting(userId, id);
    const activities = await prisma.plantingActivity.findMany({
      where: { plantingId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      ...presentPlanting(planting),
      cropProfile: {
        idealTempMinC: Number(planting.cropType.idealTempMinC),
        idealTempMaxC: Number(planting.cropType.idealTempMaxC),
        frostSensitive: planting.cropType.frostSensitive,
        excessRainSensitive: planting.cropType.excessRainSensitive,
        droughtSensitive: planting.cropType.droughtSensitive,
        windSensitive: planting.cropType.windSensitive,
        notes: planting.cropType.notes,
      },
      activities: activities.map((a) => ({ id: a.id, type: a.type, description: a.description, createdAt: a.createdAt.toISOString() })),
    };
  },

  /**
   * Harvest estimation workflow: crop selected → load growth profile → read planting
   * date → compute min/max harvest dates → persist estimate alongside the planting.
   */
  async create(userId: string, input: CreatePlantingInput) {
    await farmService.getOwned(userId, input.farmId);
    const crop = await getCropType(input.cropTypeId);

    let fieldId = input.fieldId;
    if (fieldId) {
      const field = await fieldService.getOwned(userId, fieldId);
      if (field.farmId !== input.farmId) throw AppError.badRequest('The selected field does not belong to the selected farm.');
    }

    const window = estimateHarvestWindow(input.plantingDate, {
      minDaysToHarvest: crop.minDaysToHarvest,
      maxDaysToHarvest: crop.maxDaysToHarvest,
    });

    const planting = await prisma.$transaction(async (tx) => {
      if (!fieldId) {
        const exists = await tx.field.findFirst({ where: { farmId: input.farmId, name: input.newFieldName! } });
        fieldId = exists?.id ?? (await tx.field.create({ data: { farmId: input.farmId, name: input.newFieldName! } })).id;
      }
      const created = await tx.planting.create({
        data: {
          fieldId,
          cropTypeId: crop.id,
          variety: input.variety,
          plantingDate: input.plantingDate,
          plotLocation: input.plotLocation,
          notes: input.notes,
          estimatedHarvestStart: window.start,
          estimatedHarvestEnd: window.end,
        },
      });
      await logActivity(
        created.id,
        'PLANTED',
        `${crop.name}${input.variety ? ` (${input.variety})` : ''} planted on ${toDateOnly(input.plantingDate)}. ` +
          `Estimated harvest window ${toDateOnly(window.start)} – ${toDateOnly(window.end)}.`,
        tx,
      );
      return created;
    });

    scanInBackground(userId);
    return this.get(userId, planting.id);
  },

  async update(userId: string, id: string, input: UpdatePlantingInput) {
    const current = await getOwnedPlanting(userId, id);
    if (current.status === 'HARVESTED' && (input.plantingDate || input.cropTypeId || input.status)) {
      throw AppError.badRequest('Harvested plantings cannot change crop, planting date or status.');
    }

    if (input.fieldId && input.fieldId !== current.fieldId) await fieldService.getOwned(userId, input.fieldId);

    const crop = input.cropTypeId ? await getCropType(input.cropTypeId) : current.cropType;
    const plantingDate = input.plantingDate ?? current.plantingDate;
    const recalc = Boolean(input.cropTypeId || input.plantingDate);
    const window = recalc ? estimateHarvestWindow(plantingDate, crop) : null;

    const changes: string[] = [];
    if (input.cropTypeId && input.cropTypeId !== current.cropTypeId) changes.push(`crop → ${crop.name}`);
    if (input.plantingDate && toDateOnly(input.plantingDate) !== toDateOnly(current.plantingDate))
      changes.push(`planting date → ${toDateOnly(input.plantingDate)}`);
    if (input.fieldId && input.fieldId !== current.fieldId) changes.push('field changed');
    if (input.status && input.status !== current.status) changes.push(`status → ${input.status.toLowerCase()}`);
    if (input.variety !== undefined && input.variety !== current.variety) changes.push('variety updated');
    if (input.notes !== undefined && input.notes !== current.notes) changes.push('notes updated');
    if (input.plotLocation !== undefined && input.plotLocation !== current.plotLocation) changes.push('location updated');

    await prisma.$transaction(async (tx) => {
      await tx.planting.update({
        where: { id },
        data: {
          ...input,
          ...(window && { estimatedHarvestStart: window.start, estimatedHarvestEnd: window.end }),
        },
      });
      if (changes.length) {
        const extra = window ? ` New estimated window ${toDateOnly(window.start)} – ${toDateOnly(window.end)}.` : '';
        await logActivity(id, 'UPDATED', `Updated: ${changes.join(', ')}.${extra}`, tx);
      }
    });
    return this.get(userId, id);
  },

  async remove(userId: string, id: string) {
    await getOwnedPlanting(userId, id);
    await prisma.planting.delete({ where: { id } });
  },

  async addNote(userId: string, id: string, description: string) {
    await getOwnedPlanting(userId, id);
    const a = await logActivity(id, 'NOTE', description);
    return { id: a.id, type: a.type, description: a.description, createdAt: a.createdAt.toISOString() };
  },

  async recordHarvest(
    userId: string,
    id: string,
    input: { actualHarvestDate: Date; quantity: number; unit: 'KG' | 'LB' | 'TONS' | 'BUSHELS' | 'CRATES'; quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; notes: string | null },
  ) {
    const planting = await getOwnedPlanting(userId, id);
    if (planting.harvest) throw AppError.conflict('A harvest has already been recorded for this planting.');
    if (planting.status === 'FAILED') throw AppError.badRequest('This planting is marked as failed and cannot be harvested.');
    if (input.actualHarvestDate < planting.plantingDate) {
      throw AppError.badRequest('Harvest date cannot be before the planting date.', {
        actualHarvestDate: ['Harvest date cannot be before the planting date.'],
      });
    }

    const harvest = await prisma.$transaction(async (tx) => {
      const h = await tx.harvest.create({ data: { plantingId: id, ...input } });
      await tx.planting.update({ where: { id }, data: { status: 'HARVESTED' } });
      await logActivity(
        id,
        'HARVESTED',
        `Harvested ${input.quantity} ${input.unit.toLowerCase()} (${input.quality.toLowerCase()} quality) on ${toDateOnly(input.actualHarvestDate)}.`,
        tx,
      );
      return h;
    });
    return presentHarvest(harvest);
  },
};

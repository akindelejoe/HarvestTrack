import type { AlertSeverity, Harvest, Prisma } from '@prisma/client';
import { addDays, startOfDayUTC, toDateOnly } from '../utils/dates.js';
import { calculateProgress, deriveDisplayStatus } from './harvestEstimationService.js';

/** Prisma include used everywhere a planting is presented. */
export function plantingInclude() {
  return {
    cropType: true,
    field: { include: { farm: true } },
    harvest: true,
    alerts: {
      where: { forecastDate: { gte: addDays(startOfDayUTC(), -1) } },
      select: { severity: true, id: true },
    },
  } satisfies Prisma.PlantingInclude;
}

export type PlantingWithRelations = Prisma.PlantingGetPayload<{ include: ReturnType<typeof plantingInclude> }>;

export type RiskLevel = 'NONE' | AlertSeverity;

export function presentPlanting(p: PlantingWithRelations, today = new Date()) {
  const window = { start: p.estimatedHarvestStart, end: p.estimatedHarvestEnd };
  const progress = calculateProgress({ plantingDate: p.plantingDate, window, harvestedOn: p.harvest?.actualHarvestDate }, today);

  const activeAlerts = p.status === 'ACTIVE' ? p.alerts : [];
  const risk: RiskLevel = activeAlerts.some((a) => a.severity === 'HIGH')
    ? 'HIGH'
    : activeAlerts.some((a) => a.severity === 'MODERATE')
      ? 'MODERATE'
      : activeAlerts.length
        ? 'LOW'
        : 'NONE';

  return {
    id: p.id,
    variety: p.variety,
    plotLocation: p.plotLocation,
    notes: p.notes,
    status: p.status,
    displayStatus: deriveDisplayStatus(p.status, progress, risk === 'HIGH' || risk === 'MODERATE'),
    plantingDate: toDateOnly(p.plantingDate),
    estimatedHarvestStart: toDateOnly(p.estimatedHarvestStart),
    estimatedHarvestEnd: toDateOnly(p.estimatedHarvestEnd),
    progress,
    risk: { level: risk, activeAlerts: activeAlerts.length },
    crop: {
      id: p.cropType.id,
      name: p.cropType.name,
      minDaysToHarvest: p.cropType.minDaysToHarvest,
      maxDaysToHarvest: p.cropType.maxDaysToHarvest,
    },
    field: { id: p.field.id, name: p.field.name },
    farm: { id: p.field.farm.id, name: p.field.farm.name, location: p.field.farm.location },
    harvest: p.harvest ? presentHarvest(p.harvest) : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function presentHarvest(h: Harvest) {
  return {
    id: h.id,
    actualHarvestDate: toDateOnly(h.actualHarvestDate),
    quantity: Number(h.quantity),
    unit: h.unit,
    quality: h.quality,
    notes: h.notes,
  };
}

export type PlantingDTO = ReturnType<typeof presentPlanting>;

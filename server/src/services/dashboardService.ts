import { prisma } from '../database/prisma.js';
import { addDays, startOfDayUTC } from '../utils/dates.js';
import { alertService } from './alertService.js';
import { plantingInclude, presentPlanting } from './plantingPresenter.js';

export const dashboardService = {
  async summary(userId: string) {
    const [plantingRows, activeAlertCount, unreadAlertCount, totalHarvests, recentAlerts, farms, harvestRows] = await Promise.all([
      prisma.planting.findMany({
        where: { field: { farm: { userId } }, status: 'ACTIVE' },
        include: plantingInclude(),
        orderBy: { estimatedHarvestStart: 'asc' },
      }),
      prisma.alert.count({ where: alertService.activeWhere(userId) }),
      prisma.alert.count({ where: { userId, readAt: null } }),
      prisma.harvest.count({ where: { planting: { field: { farm: { userId } } } } }),
      prisma.alert.findMany({
        where: alertService.activeWhere(userId),
        orderBy: [{ severity: 'desc' }, { forecastDate: 'asc' }],
        take: 5,
        include: { planting: { include: { cropType: true, field: true } } },
      }),
      prisma.farm.findMany({
        where: { userId },
        select: { id: true, name: true, location: true, fields: { select: { id: true, name: true, areaAcres: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.harvest.findMany({
        where: {
          planting: { field: { farm: { userId } } },
          actualHarvestDate: { gte: addDays(startOfDayUTC(), -365) },
        },
        select: { actualHarvestDate: true },
      }),
    ]);

    const plantings = plantingRows.map((p) => presentPlanting(p));
    const fieldStatus = farms.flatMap((farm) =>
      farm.fields.map((f) => {
        const here = plantings.filter((p) => p.field.id === f.id);
        const riskOrder = ['NONE', 'LOW', 'MODERATE', 'HIGH'] as const;
        const worst = here.reduce<(typeof riskOrder)[number]>(
          (acc, p) => (riskOrder.indexOf(p.risk.level) > riskOrder.indexOf(acc) ? p.risk.level : acc),
          'NONE',
        );
        return {
          id: f.id,
          name: f.name,
          farmName: farm.name,
          areaAcres: f.areaAcres ? Number(f.areaAcres) : null,
          activePlantings: here.length,
          crops: [...new Set(here.map((p) => p.crop.name))],
          risk: worst,
        };
      }),
    );

    const months = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - i);
      months.set(d.toISOString().slice(0, 7), 0);
    }
    for (const h of harvestRows) {
      const key = h.actualHarvestDate.toISOString().slice(0, 7);
      if (months.has(key)) months.set(key, months.get(key)! + 1);
    }

    return {
      kpis: {
        activeCrops: plantings.length,
        readyForHarvest: plantings.filter((p) => p.progress.stage === 'IN_HARVEST_WINDOW' || p.progress.stage === 'PAST_HARVEST_WINDOW').length,
        harvestSoon: plantings.filter((p) => p.displayStatus === 'HARVEST_SOON').length,
        atRisk: plantings.filter((p) => p.displayStatus === 'AT_RISK').length,
        weatherAlerts: activeAlertCount,
        unreadAlerts: unreadAlertCount,
        totalHarvests,
      },
      plantings,
      upcomingHarvests: plantings
        .filter((p) => p.progress.stage !== 'PAST_HARVEST_WINDOW')
        .sort((a, b) => a.estimatedHarvestStart.localeCompare(b.estimatedHarvestStart))
        .slice(0, 5),
      recentAlerts: recentAlerts.map((a) => ({
        id: a.id,
        severity: a.severity,
        alertType: a.alertType,
        title: a.title,
        forecastDate: a.forecastDate.toISOString().slice(0, 10),
        readAt: a.readAt?.toISOString() ?? null,
        crop: a.planting?.cropType.name ?? null,
        field: a.planting?.field.name ?? null,
        plantingId: a.plantingId,
      })),
      farms: farms.map((f) => ({ id: f.id, name: f.name, location: f.location, fieldCount: f.fields.length })),
      fieldStatus,
      harvestsByMonth: [...months.entries()].map(([month, count]) => ({ month, count })),
    };
  },
};

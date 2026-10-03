import { prisma } from '../database/prisma.js';
import { plantingInclude, presentPlanting } from './plantingPresenter.js';

/** Harvest history grouped by growing season (calendar year of planting). */
export const harvestService = {
  async history(userId: string, season?: number) {
    const seasonRows = await prisma.$queryRaw<{ season: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM p.planting_date)::int AS season
      FROM plantings p
      JOIN fields f ON f.id = p.field_id
      JOIN farms fa ON fa.id = f.farm_id
      WHERE fa.user_id = ${userId}::uuid
      ORDER BY season DESC`;
    const seasons = seasonRows.map((r) => r.season);
    const selected = season ?? seasons[0] ?? new Date().getUTCFullYear();

    const plantings = await prisma.planting.findMany({
      where: {
        field: { farm: { userId } },
        plantingDate: { gte: new Date(Date.UTC(selected, 0, 1)), lt: new Date(Date.UTC(selected + 1, 0, 1)) },
      },
      include: plantingInclude(),
      orderBy: { plantingDate: 'desc' },
    });
    const records = plantings.map((p) => presentPlanting(p));

    const harvested = records.filter((r) => r.harvest);
    const byMonth = new Map<string, number>();
    for (const r of harvested) {
      const month = r.harvest!.actualHarvestDate.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }

    // Harvest timing vs. estimate: positive = later than window start.
    const deviations = harvested.map(
      (r) => (Date.parse(r.harvest!.actualHarvestDate) - Date.parse(r.estimatedHarvestStart)) / 86_400_000,
    );

    return {
      seasons: seasons.length ? seasons : [selected],
      season: selected,
      records,
      stats: {
        plantings: records.length,
        harvested: harvested.length,
        failed: records.filter((r) => r.status === 'FAILED').length,
        avgDaysFromEstimate: deviations.length ? Math.round(deviations.reduce((a, b) => a + b, 0) / deviations.length) : null,
        harvestsByMonth: [...byMonth.entries()].sort().map(([month, count]) => ({ month, count })),
      },
    };
  },
};

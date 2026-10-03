/**
 * Harvest estimation & readiness.
 *
 * These are calendar-based ESTIMATES derived from a crop's typical growing range
 * (crop_types.minimum/maximum_days_to_harvest). They do not measure actual crop
 * maturity, which depends on variety, weather, soil and management.
 *
 * Pure functions only — easy to unit test and reuse from any service.
 */
import { addDays, diffInDays, startOfDayUTC } from '../utils/dates.js';

export interface GrowthProfile {
  minDaysToHarvest: number;
  maxDaysToHarvest: number;
}

export interface HarvestWindow {
  start: Date;
  end: Date;
}

export type ReadinessStage =
  | 'EARLY_GROWTH'
  | 'MID_GROWTH'
  | 'HARVEST_APPROACHING'
  | 'IN_HARVEST_WINDOW'
  | 'PAST_HARVEST_WINDOW'
  | 'HARVESTED';

export type DisplayStatus = 'GROWING' | 'HARVEST_SOON' | 'READY' | 'AT_RISK' | 'HARVESTED' | 'FAILED';

export interface GrowthProgress {
  daysGrowing: number;
  /** Days until the estimated window opens (0 once inside/after the window). */
  daysUntilWindowStart: number;
  /** Days until the estimated window closes (negative once past it). */
  daysUntilWindowEnd: number;
  /** Share of the minimum expected growing period that has elapsed, 0–100. */
  readinessPercent: number;
  /** Position on the planting → end-of-window timeline, 0–100 (for progress bars). */
  timelinePercent: number;
  stage: ReadinessStage;
}

/** Days before the window opens at which a crop is flagged "Harvest Soon". */
export const HARVEST_SOON_DAYS = 14;

export function estimateHarvestWindow(plantingDate: Date, profile: GrowthProfile): HarvestWindow {
  if (profile.minDaysToHarvest <= 0 || profile.maxDaysToHarvest < profile.minDaysToHarvest) {
    throw new Error('Invalid growth profile: expected 0 < minDays <= maxDays');
  }
  const planted = startOfDayUTC(plantingDate);
  return {
    start: addDays(planted, profile.minDaysToHarvest),
    end: addDays(planted, profile.maxDaysToHarvest),
  };
}

export function readinessStageFor(percent: number, today: Date, window: HarvestWindow): ReadinessStage {
  if (diffInDays(today, window.end) > 0) return 'PAST_HARVEST_WINDOW';
  if (diffInDays(today, window.start) >= 0) return 'IN_HARVEST_WINDOW';
  if (percent >= 75) return 'HARVEST_APPROACHING';
  if (percent >= 35) return 'MID_GROWTH';
  return 'EARLY_GROWTH';
}

export function calculateProgress(
  input: { plantingDate: Date; window: HarvestWindow; harvestedOn?: Date | null },
  today: Date = new Date(),
): GrowthProgress {
  const asOf = startOfDayUTC(input.harvestedOn ?? today);
  const daysGrowing = Math.max(0, diffInDays(asOf, input.plantingDate));
  const minDays = Math.max(1, diffInDays(input.window.start, input.plantingDate));
  const maxDays = Math.max(minDays, diffInDays(input.window.end, input.plantingDate));

  const readinessPercent = clampPercent((daysGrowing / minDays) * 100);
  const timelinePercent = clampPercent((daysGrowing / maxDays) * 100);
  const daysUntilWindowStart = Math.max(0, diffInDays(input.window.start, asOf));
  const daysUntilWindowEnd = diffInDays(input.window.end, asOf);

  return {
    daysGrowing,
    daysUntilWindowStart,
    daysUntilWindowEnd,
    readinessPercent,
    timelinePercent,
    stage: input.harvestedOn ? 'HARVESTED' : readinessStageFor(readinessPercent, asOf, input.window),
  };
}

/**
 * Collapses lifecycle state, estimated progress and current weather risk into
 * the single status badge shown in the UI. Weather risk takes precedence because
 * it is the most time-sensitive thing a grower needs to act on.
 */
export function deriveDisplayStatus(
  lifecycle: 'ACTIVE' | 'HARVESTED' | 'FAILED',
  progress: GrowthProgress,
  hasElevatedRisk: boolean,
): DisplayStatus {
  if (lifecycle === 'HARVESTED') return 'HARVESTED';
  if (lifecycle === 'FAILED') return 'FAILED';
  if (hasElevatedRisk) return 'AT_RISK';
  if (progress.stage === 'IN_HARVEST_WINDOW' || progress.stage === 'PAST_HARVEST_WINDOW') return 'READY';
  if (progress.daysUntilWindowStart <= HARVEST_SOON_DAYS) return 'HARVEST_SOON';
  return 'GROWING';
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

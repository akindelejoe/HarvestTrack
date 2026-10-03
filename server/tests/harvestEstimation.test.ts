import { describe, expect, it } from 'vitest';
import {
  calculateProgress,
  deriveDisplayStatus,
  estimateHarvestWindow,
} from '../src/services/harvestEstimationService.js';
import { parseDateOnly, toDateOnly } from '../src/utils/dates.js';

const corn = { minDaysToHarvest: 100, maxDaysToHarvest: 120 };
const planted = parseDateOnly('2026-04-15');
const window = estimateHarvestWindow(planted, corn);

describe('estimateHarvestWindow', () => {
  it('adds min and max growing days to the planting date (spec example)', () => {
    expect(toDateOnly(window.start)).toBe('2026-07-24');
    expect(toDateOnly(window.end)).toBe('2026-08-13');
  });

  it('is unaffected by DST transitions', () => {
    const w = estimateHarvestWindow(parseDateOnly('2026-03-01'), { minDaysToHarvest: 30, maxDaysToHarvest: 40 });
    expect(toDateOnly(w.start)).toBe('2026-03-31');
  });

  it('rejects invalid profiles', () => {
    expect(() => estimateHarvestWindow(planted, { minDaysToHarvest: 0, maxDaysToHarvest: 10 })).toThrow();
    expect(() => estimateHarvestWindow(planted, { minDaysToHarvest: 50, maxDaysToHarvest: 40 })).toThrow();
  });
});

describe('calculateProgress', () => {
  const at = (d: string) => calculateProgress({ plantingDate: planted, window }, parseDateOnly(d));

  it('reports readiness as share of the minimum growing period', () => {
    const p = at('2026-07-12'); // day 88 of 100
    expect(p.daysGrowing).toBe(88);
    expect(p.readinessPercent).toBe(88);
    expect(p.daysUntilWindowStart).toBe(12);
    expect(p.stage).toBe('HARVEST_APPROACHING');
  });

  it.each([
    ['2026-04-25', 'EARLY_GROWTH'],
    ['2026-06-01', 'MID_GROWTH'],
    ['2026-07-10', 'HARVEST_APPROACHING'],
    ['2026-07-24', 'IN_HARVEST_WINDOW'],
    ['2026-08-13', 'IN_HARVEST_WINDOW'],
    ['2026-08-14', 'PAST_HARVEST_WINDOW'],
  ])('on %s the stage is %s', (date, stage) => {
    expect(at(date).stage).toBe(stage);
  });

  it('caps readiness at 100% and never goes negative', () => {
    expect(at('2026-12-01').readinessPercent).toBe(100);
    expect(at('2026-04-01').readinessPercent).toBe(0);
  });

  it('freezes progress at the actual harvest date', () => {
    const p = calculateProgress({ plantingDate: planted, window, harvestedOn: parseDateOnly('2026-07-30') }, parseDateOnly('2027-01-01'));
    expect(p.daysGrowing).toBe(106);
    expect(p.stage).toBe('HARVESTED');
  });
});

describe('deriveDisplayStatus', () => {
  const progress = (d: string) => calculateProgress({ plantingDate: planted, window }, parseDateOnly(d));

  it('maps lifecycle and progress to badges', () => {
    expect(deriveDisplayStatus('ACTIVE', progress('2026-05-01'), false)).toBe('GROWING');
    expect(deriveDisplayStatus('ACTIVE', progress('2026-07-15'), false)).toBe('HARVEST_SOON');
    expect(deriveDisplayStatus('ACTIVE', progress('2026-07-30'), false)).toBe('READY');
    expect(deriveDisplayStatus('HARVESTED', progress('2026-07-30'), true)).toBe('HARVESTED');
  });

  it('prioritises elevated weather risk for active plantings', () => {
    expect(deriveDisplayStatus('ACTIVE', progress('2026-07-30'), true)).toBe('AT_RISK');
  });
});

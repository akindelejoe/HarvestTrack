import { describe, expect, it } from 'vitest';
import { detectHazards, severityAtLeast, type CropSensitivity } from '../src/services/hazardDetectionService.js';
import type { ForecastDay } from '../src/services/weather/types.js';

const tomato: CropSensitivity = {
  name: 'Tomato', idealTempMinC: 18, idealTempMaxC: 29,
  frostSensitive: true, excessRainSensitive: true, droughtSensitive: true, windSensitive: false,
};
const wheat: CropSensitivity = {
  name: 'Wheat', idealTempMinC: 12, idealTempMaxC: 25,
  frostSensitive: false, excessRainSensitive: false, droughtSensitive: false, windSensitive: true,
};

const calm = (date: string, o: Partial<ForecastDay> = {}): ForecastDay => ({
  date, condition: 'clear', tempMinC: 14, tempMaxC: 24, precipitationMm: 2,
  precipitationProbability: 20, windSpeedMaxKph: 12, windGustsMaxKph: 20, ...o,
});
const week = (overrides: Record<number, Partial<ForecastDay>> = {}) =>
  Array.from({ length: 7 }, (_, i) => calm(`2026-10-0${i + 1}`, overrides[i]));
const ctx = (crop: CropSensitivity) => ({ crop, fieldName: 'North Field', today: '2026-10-01' });

describe('detectHazards', () => {
  it('returns nothing for benign weather', () => {
    expect(detectHazards(week(), ctx(tomato))).toEqual([]);
  });

  it('flags frost as HIGH for frost-sensitive crops and MODERATE otherwise', () => {
    const f = week({ 1: { tempMinC: -0.5 } });
    expect(detectHazards(f, ctx(tomato))[0]).toMatchObject({ type: 'FROST', severity: 'HIGH', forecastDate: '2026-10-02' });
    expect(detectHazards(f, ctx(wheat))[0]).toMatchObject({ type: 'FROST', severity: 'MODERATE' });
  });

  it('warns near-frost only for sensitive crops', () => {
    const f = week({ 2: { tempMinC: 1.5 } });
    expect(detectHazards(f, ctx(tomato)).map((h) => h.type)).toContain('FROST');
    expect(detectHazards(f, ctx(wheat)).map((h) => h.type)).not.toContain('FROST');
  });

  it('uses the worst severity across a consecutive run but keeps the first date', () => {
    const f = week({ 3: { precipitationMm: 26 }, 4: { precipitationMm: 60 } });
    const [rain] = detectHazards(f, ctx(wheat));
    expect(rain).toMatchObject({ type: 'HEAVY_RAIN', severity: 'HIGH', forecastDate: '2026-10-04' });
    expect(rain.message).toContain('86 mm');
  });

  it('mentions the 48-hour horizon for imminent heavy rain', () => {
    const [rain] = detectHazards(week({ 1: { precipitationMm: 30 } }), ctx(tomato));
    expect(rain.message).toContain('within the next 48 hours');
  });

  it('grades heat relative to the crop ideal range', () => {
    expect(detectHazards(week({ 0: { tempMaxC: 33.5 } }), ctx(tomato))[0]).toMatchObject({ type: 'EXTREME_HEAT', severity: 'LOW', title: 'Elevated Temperature' });
    expect(detectHazards(week({ 0: { tempMaxC: 41 } }), ctx(tomato))[0]).toMatchObject({ severity: 'HIGH', title: 'Extreme Heat Warning' });
  });

  it('escalates strong wind for wind-sensitive crops', () => {
    const f = week({ 5: { windGustsMaxKph: 65 } });
    expect(detectHazards(f, ctx(tomato))[0]).toMatchObject({ type: 'STRONG_WIND', severity: 'MODERATE' });
    expect(detectHazards(f, ctx(wheat))[0]).toMatchObject({ type: 'STRONG_WIND', severity: 'HIGH' });
  });

  it('detects a hot dry spell for drought-sensitive crops', () => {
    const dry = Array.from({ length: 7 }, (_, i) => calm(`2026-10-0${i + 1}`, { precipitationMm: 0, tempMaxC: 34 }));
    const drought = detectHazards(dry, ctx(tomato)).find((h) => h.type === 'DROUGHT');
    expect(drought?.severity).toBe('HIGH');
  });

  it('ignores forecast days before today', () => {
    expect(detectHazards(week({ 0: { tempMinC: -5 } }), { ...ctx(tomato), today: '2026-10-02' })).toEqual([]);
  });

  it('orders findings most severe first', () => {
    const f = week({ 0: { tempMaxC: 33.5 }, 2: { tempMinC: -4 } });
    expect(detectHazards(f, ctx(tomato)).map((h) => h.severity)).toEqual(['HIGH', 'LOW']);
  });
});

describe('severityAtLeast', () => {
  it('compares severity levels', () => {
    expect(severityAtLeast('HIGH', 'MODERATE')).toBe(true);
    expect(severityAtLeast('LOW', 'HIGH')).toBe(false);
    expect(severityAtLeast('MODERATE', 'MODERATE')).toBe(true);
  });
});

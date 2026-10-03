/**
 * Hazard detection — rule engine that compares a forecast against a crop's
 * sensitivity profile and returns potential hazards.
 *
 * Thresholds are deliberately conservative, general-purpose heuristics. Output is
 * informational decision support, not an agronomic guarantee.
 */
import type { AlertSeverity, AlertType } from '@prisma/client';
import type { ForecastDay } from './weather/types.js';

export interface CropSensitivity {
  name: string;
  idealTempMinC: number;
  idealTempMaxC: number;
  frostSensitive: boolean;
  excessRainSensitive: boolean;
  droughtSensitive: boolean;
  windSensitive: boolean;
}

export interface HazardContext {
  crop: CropSensitivity;
  fieldName: string;
  /** Farm-local "today" as YYYY-MM-DD; forecast days before it are ignored. */
  today: string;
}

export interface HazardFinding {
  type: AlertType;
  severity: AlertSeverity;
  forecastDate: string;
  title: string;
  message: string;
  impact: string;
  recommendation: string;
  /** Short line used for SMS bodies. */
  smsSummary: string;
}

export const THRESHOLDS = {
  frost: { severeC: -3, freezeC: 0, nearFrostC: 2 },
  heat: { extremeC: 40, highC: 36, aboveIdealMarginC: 4 },
  rain: { extremeMm: 50, heavyMm: 25, sensitiveMm: 15 },
  wind: { extremeKph: 90, strongKph: 60, sensitiveKph: 45 },
  drought: { maxTotalMm: 3, minDays: 5, warmAvgMaxC: 28, hotAvgMaxC: 33 },
} as const;

const SEVERITY_RANK: Record<AlertSeverity, number> = { LOW: 1, MODERATE: 2, HIGH: 3 };

export function severityAtLeast(severity: AlertSeverity, minimum: AlertSeverity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[minimum];
}

export function maxSeverity(a: AlertSeverity, b: AlertSeverity): AlertSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

const bump = (s: AlertSeverity): AlertSeverity => (s === 'LOW' ? 'MODERATE' : 'HIGH');

type DayRule = (day: ForecastDay, crop: CropSensitivity) => AlertSeverity | null;

const frostRule: DayRule = (day, crop) => {
  const t = day.tempMinC;
  if (t <= THRESHOLDS.frost.severeC) return 'HIGH';
  if (t <= THRESHOLDS.frost.freezeC) return crop.frostSensitive ? 'HIGH' : 'MODERATE';
  if (t <= THRESHOLDS.frost.nearFrostC && crop.frostSensitive) return 'MODERATE';
  return null;
};

const heatRule: DayRule = (day, crop) => {
  const t = day.tempMaxC;
  if (t >= THRESHOLDS.heat.extremeC) return 'HIGH';
  if (t >= THRESHOLDS.heat.highC) return 'MODERATE';
  if (t >= crop.idealTempMaxC + THRESHOLDS.heat.aboveIdealMarginC) return 'LOW';
  return null;
};

const rainRule: DayRule = (day, crop) => {
  const mm = day.precipitationMm;
  if (mm >= THRESHOLDS.rain.extremeMm) return 'HIGH';
  if (mm >= THRESHOLDS.rain.heavyMm) return crop.excessRainSensitive ? 'HIGH' : 'MODERATE';
  if (mm >= THRESHOLDS.rain.sensitiveMm && crop.excessRainSensitive) return 'LOW';
  return null;
};

const windRule: DayRule = (day, crop) => {
  const kph = Math.max(day.windGustsMaxKph, day.windSpeedMaxKph);
  let s: AlertSeverity | null = null;
  if (kph >= THRESHOLDS.wind.extremeKph) s = 'HIGH';
  else if (kph >= THRESHOLDS.wind.strongKph) s = 'MODERATE';
  else if (kph >= THRESHOLDS.wind.sensitiveKph && crop.windSensitive) s = 'LOW';
  return s && crop.windSensitive && s !== 'LOW' ? bump(s) : s;
};

const DAY_RULES: Array<[AlertType, DayRule]> = [
  ['FROST', frostRule],
  ['EXTREME_HEAT', heatRule],
  ['HEAVY_RAIN', rainRule],
  ['STRONG_WIND', windRule],
];

/**
 * For each hazard type, finds the first forecast day that triggers it and reports
 * the worst severity across the consecutive run of triggering days that follows.
 * Keeping the *first* day stable means repeated scans de-duplicate cleanly.
 */
export function detectHazards(forecast: ForecastDay[], ctx: HazardContext): HazardFinding[] {
  const days = forecast.filter((d) => d.date >= ctx.today).sort((a, b) => a.date.localeCompare(b.date));
  const findings: HazardFinding[] = [];

  for (const [type, rule] of DAY_RULES) {
    const startIdx = days.findIndex((d) => rule(d, ctx.crop) !== null);
    if (startIdx === -1) continue;

    let severity = rule(days[startIdx], ctx.crop)!;
    const run: ForecastDay[] = [days[startIdx]];
    for (let i = startIdx + 1; i < days.length; i++) {
      const s = rule(days[i], ctx.crop);
      if (!s) break;
      severity = maxSeverity(severity, s);
      run.push(days[i]);
    }
    findings.push(describe(type, severity, run, ctx));
  }

  const drought = detectDrought(days, ctx);
  if (drought) findings.push(drought);

  return findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

function detectDrought(days: ForecastDay[], ctx: HazardContext): HazardFinding | null {
  if (days.length < THRESHOLDS.drought.minDays) return null;
  const totalMm = days.reduce((sum, d) => sum + d.precipitationMm, 0);
  const avgMax = days.reduce((sum, d) => sum + d.tempMaxC, 0) / days.length;
  if (totalMm > THRESHOLDS.drought.maxTotalMm || avgMax < THRESHOLDS.drought.warmAvgMaxC) return null;

  let severity: AlertSeverity = ctx.crop.droughtSensitive ? 'MODERATE' : 'LOW';
  if (ctx.crop.droughtSensitive && avgMax >= THRESHOLDS.drought.hotAvgMaxC) severity = 'HIGH';
  return describe('DROUGHT', severity, days, ctx, { totalMm, avgMax });
}

function describe(
  type: AlertType,
  severity: AlertSeverity,
  run: ForecastDay[],
  ctx: HazardContext,
  extra?: { totalMm: number; avgMax: number },
): HazardFinding {
  const first = run[0];
  const crop = ctx.crop.name.toLowerCase();
  const when = relativeWhen(first.date, ctx.today);
  const span = run.length > 1 ? ` (${run.length} days)` : '';
  const base = { type, severity, forecastDate: first.date };

  switch (type) {
    case 'FROST': {
      const low = Math.min(...run.map((d) => d.tempMinC));
      return {
        ...base,
        title: 'Frost Warning',
        message: `Temperatures may drop to ${fmt(low)}°C ${when}${span} at ${ctx.fieldName}, below the safe range for your ${crop}.`,
        impact: 'Possible frost damage to leaves, flowers and young fruit.',
        recommendation: 'Consider covering or otherwise protecting sensitive plants and delaying irrigation until it warms.',
        smsSummary: `Possible frost ${when} for ${ctx.fieldName} (low ${fmt(low)}°C). ${cap(crop)} may be at risk.`,
      };
    }
    case 'EXTREME_HEAT': {
      const high = Math.max(...run.map((d) => d.tempMaxC));
      const label = severity === 'LOW' ? 'Elevated Temperature' : 'Extreme Heat Warning';
      return {
        ...base,
        title: label,
        message: `Highs up to ${fmt(high)}°C are forecast ${when}${span} at ${ctx.fieldName}, above the ideal range for ${crop} (${fmt(ctx.crop.idealTempMinC)}–${fmt(ctx.crop.idealTempMaxC)}°C).`,
        impact: 'Possible heat stress, reduced pollination and moisture loss.',
        recommendation: 'Check soil moisture, irrigate early in the day and consider shade for sensitive crops.',
        smsSummary: `High heat (${fmt(high)}°C) expected ${when} for ${ctx.fieldName}. ${cap(crop)} may experience heat stress.`,
      };
    }
    case 'HEAVY_RAIN': {
      const total = run.reduce((s, d) => s + d.precipitationMm, 0);
      const within48h = daysBetween(ctx.today, first.date) <= 2;
      return {
        ...base,
        title: 'Heavy Rain Warning',
        message: `Heavy rainfall (about ${fmt(total)} mm) is forecast for your farm ${within48h ? 'within the next 48 hours' : when}${span}, affecting ${crop} at ${ctx.fieldName}.`,
        impact: 'Possible waterlogging, soil erosion and crop damage.',
        recommendation: 'Inspect drainage and low-lying areas, and postpone fertiliser application.',
        smsSummary: `Heavy rain (~${fmt(total)} mm) expected ${when} for ${ctx.fieldName}. Check drainage around your ${crop}.`,
      };
    }
    case 'STRONG_WIND': {
      const gust = Math.max(...run.map((d) => Math.max(d.windGustsMaxKph, d.windSpeedMaxKph)));
      return {
        ...base,
        title: 'Strong Wind Warning',
        message: `Wind gusts up to ${fmt(gust)} km/h are forecast ${when}${span} at ${ctx.fieldName}.`,
        impact: `Possible lodging, broken stems or damaged structures around your ${crop}.`,
        recommendation: 'Secure covers, stakes and greenhouse panels; avoid spraying in high wind.',
        smsSummary: `Strong winds (gusts ${fmt(gust)} km/h) expected ${when} for ${ctx.fieldName}. ${cap(crop)} may be at risk.`,
      };
    }
    case 'DROUGHT':
      return {
        ...base,
        title: 'Dry Spell Advisory',
        message: `Only ${fmt(extra?.totalMm ?? 0)} mm of rain is forecast over the next ${run.length} days with average highs of ${fmt(extra?.avgMax ?? 0)}°C at ${ctx.fieldName}.`,
        impact: `Possible moisture stress for ${crop}, especially during flowering or tuber/grain fill.`,
        recommendation: 'Monitor soil moisture and plan irrigation; consider mulching to reduce evaporation.',
        smsSummary: `Extended dry, warm spell forecast for ${ctx.fieldName}. Monitor soil moisture for your ${crop}.`,
      };
  }
}

function relativeWhen(date: string, today: string): string {
  const d = daysBetween(today, date);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  return `on ${weekday}`;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

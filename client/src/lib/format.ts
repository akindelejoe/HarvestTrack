import type { AlertType, CropQuality, DisplayStatus, HarvestUnit, ReadinessStage, RiskLevel, Severity } from '@/types';

const parse = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

export function formatDate(ymd: string, opts: { year?: boolean } = { year: true }) {
  return parse(ymd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(opts.year !== false && { year: 'numeric' }),
    timeZone: 'UTC',
  });
}

export function formatWindow(start: string, end: string) {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, { year: !sameYear })} – ${formatDate(end)}`;
}

export function formatMonth(ym: string, long = false) {
  return parse(`${ym}-01`).toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined, timeZone: 'UTC' });
}

export function weekday(ymd: string, short = true) {
  return parse(ymd).toLocaleDateString('en-US', { weekday: short ? 'short' : 'long', timeZone: 'UTC' });
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// ---------- Domain labels ----------

export const STATUS_META: Record<DisplayStatus, { label: string; tone: Tone }> = {
  GROWING: { label: 'Growing', tone: 'slate' },
  HARVEST_SOON: { label: 'Harvest Soon', tone: 'amber' },
  READY: { label: 'Ready to Harvest', tone: 'gold' },
  AT_RISK: { label: 'At Risk', tone: 'terra' },
  HARVESTED: { label: 'Harvested', tone: 'sage' },
  FAILED: { label: 'Failed', tone: 'gray' },
};

export const STAGE_META: Record<ReadinessStage, { label: string; description: string }> = {
  EARLY_GROWTH: { label: 'Early Growth', description: 'Establishment and vegetative growth.' },
  MID_GROWTH: { label: 'Mid Growth', description: 'Main growth phase.' },
  HARVEST_APPROACHING: { label: 'Harvest Approaching', description: 'The estimated harvest window opens soon.' },
  IN_HARVEST_WINDOW: { label: 'Estimated Harvest Window', description: 'Within the typical harvest window for this crop.' },
  PAST_HARVEST_WINDOW: { label: 'Past Estimated Window', description: 'Past the typical window — check the crop in the field.' },
  HARVESTED: { label: 'Harvested', description: 'Harvest recorded.' },
};

export const SEVERITY_META: Record<Severity, { label: string; tone: Tone }> = {
  HIGH: { label: 'High', tone: 'red' },
  MODERATE: { label: 'Moderate', tone: 'terra' },
  LOW: { label: 'Low', tone: 'amber' },
};

export const RISK_META: Record<RiskLevel, { label: string; tone: Tone }> = {
  NONE: { label: 'Clear', tone: 'gray' },
  LOW: { label: 'Low Risk', tone: 'amber' },
  MODERATE: { label: 'Moderate Risk', tone: 'terra' },
  HIGH: { label: 'High Risk', tone: 'red' },
};

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  FROST: 'Frost',
  EXTREME_HEAT: 'Heat',
  HEAVY_RAIN: 'Heavy rain',
  STRONG_WIND: 'Wind',
  DROUGHT: 'Dry spell',
};

export const UNIT_LABEL: Record<HarvestUnit, string> = { KG: 'kg', LB: 'lb', TONS: 'tons', BUSHELS: 'bushels', CRATES: 'crates' };
export const QUALITY_LABEL: Record<CropQuality, string> = { EXCELLENT: 'Excellent', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor' };

export type Tone = 'slate' | 'amber' | 'gold' | 'terra' | 'red' | 'sage' | 'gray' | 'violet';

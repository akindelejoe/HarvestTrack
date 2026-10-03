import clsx from 'clsx';
import { formatDate } from '@/lib/format';
import type { Planting } from '@/types';

/**
 * Planting → estimated harvest window timeline. The window is drawn as a band so
 * the estimate reads as a range, not a single guaranteed date.
 */
export function CropTimeline({ planting, compact }: { planting: Planting; compact?: boolean }) {
  const { progress } = planting;
  const total = planting.crop.maxDaysToHarvest;
  const windowStartPct = (planting.crop.minDaysToHarvest / total) * 100;
  const pct = progress.timelinePercent;
  const harvested = planting.status === 'HARVESTED';

  return (
    <div>
      <div className="relative h-2.5 rounded-full bg-surface-3" role="img" aria-label={`${progress.daysGrowing} days since planting; estimated harvest window from day ${planting.crop.minDaysToHarvest} to ${total}`}>
        <div
          className="absolute inset-y-0 rounded-r-full bg-[repeating-linear-gradient(135deg,var(--gold-soft)_0_4px,transparent_4px_8px)] ring-1 ring-gold-fill/40 ring-inset"
          style={{ left: `${windowStartPct}%`, right: 0 }}
        />
        <div
          className={clsx('absolute inset-y-0 left-0 rounded-full transition-[width] duration-700', harvested ? 'bg-sage' : 'bg-slate')}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
        {!harvested && (
          <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-slate shadow" style={{ left: `${Math.min(Math.max(pct, 2), 100)}%` }} />
        )}
      </div>
      {!compact && (
        <div className="mt-2.5 flex justify-between text-[12px] text-ink-3">
          <span>
            <span className="font-medium text-ink-2">Planted</span> · {formatDate(planting.plantingDate)}
          </span>
          <span className="text-right">
            <span className="font-medium text-ink-2">Est. window</span> · {formatDate(planting.estimatedHarvestStart, { year: false })} – {formatDate(planting.estimatedHarvestEnd)}
          </span>
        </div>
      )}
    </div>
  );
}

export function daysRemainingLabel(p: Planting) {
  if (p.status === 'HARVESTED') return 'Harvested';
  if (p.status === 'FAILED') return '—';
  const { stage, daysUntilWindowStart, daysUntilWindowEnd } = p.progress;
  if (stage === 'PAST_HARVEST_WINDOW') return `${Math.abs(daysUntilWindowEnd)}d past window`;
  if (stage === 'IN_HARVEST_WINDOW') return daysUntilWindowEnd === 0 ? 'Window closes today' : `In window · ${daysUntilWindowEnd}d left`;
  return `${daysUntilWindowStart} days`;
}

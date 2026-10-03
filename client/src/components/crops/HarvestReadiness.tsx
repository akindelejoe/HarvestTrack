import clsx from 'clsx';
import { Info } from 'lucide-react';
import { STAGE_META } from '@/lib/format';
import type { GrowthProgress } from '@/types';

const STAGES = ['EARLY_GROWTH', 'MID_GROWTH', 'HARVEST_APPROACHING', 'IN_HARVEST_WINDOW', 'PAST_HARVEST_WINDOW'] as const;

/**
 * Readiness gauge. The percentage is calendar-based (elapsed share of the crop's
 * minimum growing period) — the copy says so explicitly.
 */
export function HarvestReadiness({ progress, size = 'lg', cropName }: { progress: GrowthProgress; size?: 'lg' | 'sm'; cropName?: string }) {
  const pct = progress.readinessPercent;
  const r = size === 'lg' ? 54 : 30;
  const stroke = size === 'lg' ? 10 : 6;
  const c = 2 * Math.PI * r;
  const box = (r + stroke) * 2;
  const stage = STAGE_META[progress.stage];
  const stageIdx = STAGES.indexOf(progress.stage as (typeof STAGES)[number]);
  const harvested = progress.stage === 'HARVESTED';

  return (
    <div className={clsx('flex', size === 'lg' ? 'flex-col gap-5 sm:flex-row sm:items-center sm:gap-6' : 'items-center gap-4')}>
      <div className="relative shrink-0" style={{ width: box, height: box }}>
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} role="img" aria-label={`Harvest readiness ${pct} percent`} className="-rotate-90">
          <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          <circle
            cx={box / 2}
            cy={box / 2}
            r={r}
            fill="none"
            stroke={harvested ? 'var(--sage)' : pct >= 100 ? 'var(--gold-fill)' : 'var(--amber-fill)'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx('num font-semibold tracking-[-0.03em] text-ink', size === 'lg' ? 'text-[30px]' : 'text-[17px]')}>
            {pct}
            <span className={clsx('text-ink-3', size === 'lg' ? 'text-base' : 'text-[11px]')}>%</span>
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {size === 'lg' && <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-3">Harvest readiness{cropName ? ` · ${cropName}` : ''}</div>}
        <div className={clsx('font-semibold text-ink', size === 'lg' ? 'mt-1 text-lg' : 'text-[14px]')}>{stage.label}</div>
        <p className={clsx('text-ink-3', size === 'lg' ? 'mt-1 text-[13.5px]' : 'text-[12.5px]')}>
          {harvested ? 'Harvest has been recorded.' : `${pct}% of the expected growing period has passed.`}
        </p>
        {size === 'lg' && !harvested && (
          <>
            <ol className="mt-4 grid grid-cols-5 gap-1" aria-label="Growth stages">
              {STAGES.map((s, i) => (
                <li key={s} className="min-w-0">
                  <div className={clsx('h-1.5 rounded-full', i < stageIdx ? 'bg-amber-fill/55' : i === stageIdx ? 'bg-amber-fill' : 'bg-surface-3')} />
                  <span className={clsx('mt-1.5 hidden truncate text-[11px] sm:block', i === stageIdx ? 'font-medium text-ink' : 'text-ink-3')}>
                    {STAGE_META[s].label.replace('Estimated ', '').replace('Past Estimated Window', 'Past Window')}
                  </span>
                  {i === stageIdx && <span className="sr-only">(current stage)</span>}
                </li>
              ))}
            </ol>
            <p className="mt-3 flex items-start gap-1.5 text-[12px] text-ink-3">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Calendar-based estimate from typical growing ranges — confirm maturity in the field.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

import clsx from 'clsx';
import { CloudRain, Flame, MessageSquare, Snowflake, Sun, Wind } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate, relativeTime } from '@/lib/format';
import type { Alert, AlertType } from '@/types';
import { SeverityBadge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const ALERT_ICONS: Record<AlertType, React.ComponentType<{ className?: string }>> = {
  FROST: Snowflake,
  EXTREME_HEAT: Flame,
  HEAVY_RAIN: CloudRain,
  STRONG_WIND: Wind,
  DROUGHT: Sun,
};

const rail = { HIGH: 'bg-red', MODERATE: 'bg-terra', LOW: 'bg-amber' } as const;

export function AlertCard({ alert, onMarkRead, marking }: { alert: Alert; onMarkRead?: () => void; marking?: boolean }) {
  const Icon = ALERT_ICONS[alert.alertType];
  const unread = !alert.readAt;
  return (
    <article className={clsx('relative overflow-hidden rounded-2xl border bg-surface', unread ? 'border-line-strong' : 'border-line')} aria-labelledby={`alert-${alert.id}`}>
      <span className={clsx('absolute inset-y-0 left-0 w-1', rail[alert.severity])} aria-hidden="true" />
      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={alert.severity} />
                <h3 id={`alert-${alert.id}`} className="text-[15px] font-semibold text-ink">{alert.title}</h3>
                {unread && <span className="rounded-full bg-slate px-1.5 py-px text-[10.5px] font-semibold uppercase tracking-wide text-white dark:text-[#17181a]">New</span>}
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                {alert.planting ? (
                  <Link to={`/app/crops/${alert.planting.id}`} className="hover:text-ink hover:underline">
                    {alert.planting.crop} · {alert.planting.field} · {alert.planting.farm}
                  </Link>
                ) : 'Farm-wide'}
                {' · '}Expected {formatDate(alert.forecastDate)}
              </p>
            </div>
          </div>
          <span className="text-[12px] text-ink-3">{relativeTime(alert.createdAt)}</span>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{alert.message}</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {alert.impact && (
            <div className="rounded-xl bg-surface-2 px-3.5 py-2.5">
              <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Possible impact</dt>
              <dd className="mt-0.5 text-[13.5px] text-ink">{alert.impact}</dd>
            </div>
          )}
          <div className="rounded-xl bg-surface-2 px-3.5 py-2.5">
            <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">Recommended action</dt>
            <dd className="mt-0.5 text-[13.5px] text-ink">{alert.recommendation}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
            {alert.smsSent && (
              <>
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> SMS sent ·
              </>
            )}
            Informational guidance based on forecast data — not a guaranteed outcome.
          </span>
          {unread && onMarkRead && (
            <Button size="sm" variant="secondary" onClick={onMarkRead} loading={marking}>
              Mark as read
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

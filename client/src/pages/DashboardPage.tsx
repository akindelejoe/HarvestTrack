import clsx from 'clsx';
import { ArrowRight, Bell, CalendarClock, CloudSun, Grid3x3, Plus, Radar, Sprout, Wheat } from 'lucide-react';
import { Link } from 'react-router';
import { ALERT_ICONS } from '@/components/alerts/AlertCard';
import { HarvestsByMonthChart, TemperatureChart } from '@/components/charts/WeatherCharts';
import { CropTimeline, daysRemainingLabel } from '@/components/crops/CropTimeline';
import { HarvestReadiness } from '@/components/crops/HarvestReadiness';
import { PlantingTable } from '@/components/crops/PlantingTable';
import { CurrentConditions } from '@/components/weather/WeatherPanels';
import { RiskBadge, SeverityBadge, StatusBadge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, PageSkeleton, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard, useScanAlerts, useWeather } from '@/hooks/queries';
import { formatDate, formatWindow, plural } from '@/lib/format';
import { errorMessage } from '@/services/api';
import type { DashboardSummary, Planting } from '@/types';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();
  const scan = useScanAlerts();
  const toast = useToast();

  if (isLoading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const firstName = user?.name.split(' ')[0];
  const hasFarms = data.farms.length > 0;

  const runScan = () =>
    scan.mutate(undefined, {
      onSuccess: (r) =>
        toast(
          'success',
          r.alertsCreated + r.alertsEscalated > 0
            ? `Hazard check complete — ${plural(r.alertsCreated + r.alertsEscalated, 'new alert')}.`
            : `Hazard check complete — no new risks across ${plural(r.plantingsEvaluated, 'planting')}.`,
        ),
      onError: (e) => toast('error', errorMessage(e)),
    });

  return (
    <div className="space-y-5 lg:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-ink-3">{greeting()}, {firstName}</p>
          <h1 className="mt-0.5 text-[28px] font-semibold tracking-[-0.025em] text-ink">Operations overview</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={runScan} loading={scan.isPending} disabled={!hasFarms}>
            {!scan.isPending && <Radar className="h-4 w-4" aria-hidden="true" />} Run hazard check
          </Button>
          <Link to="/app/crops/new" className={buttonClass('primary')}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Record planting
          </Link>
        </div>
      </header>

      {!hasFarms ? (
        <Card>
          <EmptyState
            icon={<Grid3x3 className="h-5 w-5" />}
            title="Set up your first farm"
            description="Add a farm and its fields to start tracking plantings, harvest windows and local weather risks."
            action={<Link to="/app/farms" className={buttonClass('primary')}>Create a farm</Link>}
          />
        </Card>
      ) : (
        <>
          <KpiRow data={data} />

          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <ReadinessPanel plantings={data.plantings} className="lg:col-span-7" />
            <WeatherPanel className="lg:col-span-5" />
          </div>

          <Card>
            <CardHeader
              title="My Crops"
              subtitle="Active plantings ordered by estimated harvest window"
              action={<Link to="/app/crops" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
            />
            <div className="mt-4">
              {data.plantings.length ? (
                <PlantingTable plantings={data.plantings} />
              ) : (
                <EmptyState
                  compact
                  icon={<Sprout className="h-5 w-5" />}
                  title="No crops yet"
                  description="Record your first planting to start tracking your growing season."
                  action={<Link to="/app/crops/new" className={buttonClass('primary', 'sm')}>Record planting</Link>}
                />
              )}
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
            <AlertsPanel alerts={data.recentAlerts} className="lg:col-span-4" />
            <UpcomingPanel plantings={data.upcomingHarvests} className="lg:col-span-4" />
            <FieldStatusPanel fields={data.fieldStatus} />
          </div>

          <Card>
            <CardHeader title="Harvests by month" subtitle="Harvest records over the last 12 months" />
            <div className="px-3 pt-4 pb-4 sm:px-5">
              {data.harvestsByMonth.some((m) => m.count > 0) ? (
                <HarvestsByMonthChart data={data.harvestsByMonth} />
              ) : (
                <p className="py-10 text-center text-[13.5px] text-ink-3">No harvests recorded in the last 12 months.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiRow({ data }: { data: DashboardSummary }) {
  const k = data.kpis;
  const counts = {
    GROWING: data.plantings.filter((p) => p.displayStatus === 'GROWING').length,
    HARVEST_SOON: k.harvestSoon,
    READY: data.plantings.filter((p) => p.displayStatus === 'READY').length,
    AT_RISK: k.atRisk,
  };
  const segments = [
    { key: 'GROWING', label: 'Growing', value: counts.GROWING, cls: 'bg-[#7C9FE0]' },
    { key: 'HARVEST_SOON', label: 'Harvest soon', value: counts.HARVEST_SOON, cls: 'bg-[#D9A040]' },
    { key: 'READY', label: 'Ready', value: counts.READY, cls: 'bg-[#E3CF6A]' },
    { key: 'AT_RISK', label: 'At risk', value: counts.AT_RISK, cls: 'bg-[#E07A5A]' },
  ];
  const total = Math.max(1, k.activeCrops);

  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12">
      <div className="col-span-2 rounded-2xl bg-charcoal p-5 text-[#ECE9E2] lg:col-span-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#A3A19A]">Active crops</span>
          <Sprout className="h-4 w-4 text-[#7D7B75]" aria-hidden="true" />
        </div>
        <div className="num mt-2 text-[44px] leading-none font-semibold tracking-[-0.04em]">{k.activeCrops}</div>
        <div className="mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}>
          {segments.filter((s) => s.value > 0).map((s) => (
            <div key={s.key} className={s.cls} style={{ width: `${(s.value / total) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#A3A19A]">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className={clsx('h-2 w-2 rounded-sm', s.cls)} aria-hidden="true" />
              {s.label} <span className="num font-medium text-[#ECE9E2]">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <Kpi className="lg:col-span-2" label="Ready for harvest" value={k.readyForHarvest} icon={Wheat} accent="text-gold" note={k.harvestSoon ? `${k.harvestSoon} more within 14 days` : 'In estimated window'} to="/app/crops" />
      <Kpi className="lg:col-span-3" label="Weather alerts" value={k.weatherAlerts} icon={Bell} accent="text-terra" note={k.unreadAlerts ? `${k.unreadAlerts} unread` : 'All caught up'} to="/app/alerts" emphasis={k.unreadAlerts > 0} />
      <Kpi className="col-span-2 sm:col-span-1 lg:col-span-2" label="Total harvests" value={k.totalHarvests} icon={CalendarClock} accent="text-sage" note="All seasons" to="/app/harvests" />
    </section>
  );
}

function Kpi({ label, value, icon: Icon, accent, note, to, className, emphasis }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; accent: string; note: string; to: string; className?: string; emphasis?: boolean }) {
  return (
    <Link to={to} className={clsx('group col-span-1 flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-3">{label}</span>
        <Icon className={clsx('h-4 w-4', accent)} aria-hidden="true" />
      </div>
      <div className="num mt-2 text-[36px] leading-none font-semibold tracking-[-0.04em] text-ink">{value}</div>
      <div className={clsx('mt-auto pt-4 text-[12.5px]', emphasis ? 'font-medium text-terra' : 'text-ink-3')}>{note}</div>
    </Link>
  );
}

function ReadinessPanel({ plantings, className }: { plantings: Planting[]; className?: string }) {
  const ranked = [...plantings]
    .filter((p) => p.progress.stage !== 'PAST_HARVEST_WINDOW')
    .sort((a, b) => b.progress.readinessPercent - a.progress.readinessPercent || a.progress.daysUntilWindowStart - b.progress.daysUntilWindowStart);
  const lead = ranked[0] ?? plantings[0];
  const rest = plantings.filter((p) => p.id !== lead?.id).slice(0, 4);

  return (
    <Card className={clsx('flex flex-col', className)}>
      <CardHeader title="Harvest readiness" subtitle="Share of each crop's expected growing period that has elapsed" />
      {!lead ? (
        <EmptyState compact icon={<Wheat className="h-5 w-5" />} title="Nothing growing yet" description="Readiness appears once you record a planting." />
      ) : (
        <div className="flex flex-1 flex-col gap-6 p-5">
          <Link to={`/app/crops/${lead.id}`} className="block rounded-xl border border-line bg-surface-2/50 p-4 transition-colors hover:border-line-strong sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[15px] font-semibold text-ink">{lead.crop.name}</span>
                <span className="text-[13px] text-ink-3"> · {lead.field.name}</span>
              </div>
              <StatusBadge status={lead.displayStatus} />
            </div>
            <HarvestReadiness progress={lead.progress} />
            <div className="mt-5"><CropTimeline planting={lead} /></div>
          </Link>
          {rest.length > 0 && (
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {rest.map((p) => (
                <li key={p.id}>
                  <Link to={`/app/crops/${p.id}`} className="group block">
                    <div className="flex items-baseline justify-between gap-2 text-[13px]">
                      <span className="truncate font-medium text-ink group-hover:underline">{p.crop.name} <span className="font-normal text-ink-3">· {p.field.name}</span></span>
                      <span className="num font-semibold text-ink">{p.progress.readinessPercent}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className={clsx('h-full rounded-full', p.progress.readinessPercent >= 100 ? 'bg-gold-fill' : 'bg-amber-fill')} style={{ width: `${p.progress.readinessPercent}%` }} />
                    </div>
                    <div className="mt-1 text-[12px] text-ink-3">{daysRemainingLabel(p)}{p.progress.stage !== 'IN_HARVEST_WINDOW' ? ' to window' : ''}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function WeatherPanel({ className }: { className?: string }) {
  const { data, isLoading, error, refetch } = useWeather();
  return (
    <Card className={clsx('flex flex-col', className)}>
      <CardHeader
        title="Weather"
        icon={<CloudSun className="h-4 w-4" />}
        action={<Link to="/app/weather" className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">Forecast <ArrowRight className="h-3.5 w-3.5" /></Link>}
      />
      <div className="flex flex-1 flex-col p-5 pt-3">
        {isLoading ? (
          <div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-14" /><Skeleton className="h-40" /></div>
        ) : error ? (
          <ErrorState compact title="Weather unavailable" error={error} onRetry={() => refetch()} />
        ) : data?.weather ? (
          <>
            <CurrentConditions weather={data.weather} />
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-1 text-[13px] font-medium text-ink-2">7-day temperature (°C)</h3>
              <TemperatureChart days={data.weather.daily} height={170} />
            </div>
          </>
        ) : (
          <p className="text-[13.5px] text-ink-3">Add a farm to see local weather.</p>
        )}
      </div>
    </Card>
  );
}

function AlertsPanel({ alerts, className }: { alerts: DashboardSummary['recentAlerts']; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader title="Weather alerts" subtitle="Active risks for your crops" action={<Link to="/app/alerts" className="text-[13px] font-medium text-ink-2 hover:text-ink">All</Link>} />
      {alerts.length === 0 ? (
        <EmptyState compact icon={<Bell className="h-5 w-5" />} title="No active risks" description="Forecasts look clear for your crops." />
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {alerts.map((a) => {
            const Icon = ALERT_ICONS[a.alertType];
            return (
              <li key={a.id}>
                <Link to="/app/alerts" className="flex items-start gap-3 px-5 py-3 hover:bg-surface-2/60">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SeverityBadge severity={a.severity} />
                      <span className="truncate text-[13.5px] font-medium text-ink">{a.title}</span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-3">{[a.crop, a.field].filter(Boolean).join(' · ')} · {formatDate(a.forecastDate, { year: false })}</div>
                  </div>
                  {!a.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function UpcomingPanel({ plantings, className }: { plantings: Planting[]; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader title="Upcoming harvests" subtitle="Next estimated windows" />
      {plantings.length === 0 ? (
        <EmptyState compact icon={<CalendarClock className="h-5 w-5" />} title="No upcoming harvests" />
      ) : (
        <ol className="mt-3 px-5 pb-4">
          {plantings.map((p, i) => (
            <li key={p.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < plantings.length - 1 && <span className="absolute top-5 bottom-0 left-[5px] w-px bg-line" aria-hidden="true" />}
              <span className={clsx('relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2', p.progress.stage === 'IN_HARVEST_WINDOW' ? 'border-gold-fill bg-gold-fill' : 'border-amber-fill bg-surface')} aria-hidden="true" />
              <Link to={`/app/crops/${p.id}`} className="min-w-0 flex-1 hover:underline">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13.5px] font-medium text-ink">{p.crop.name}</span>
                  <span className="num shrink-0 text-[12.5px] font-medium text-ink-2">{daysRemainingLabel(p)}</span>
                </div>
                <div className="num text-[12px] text-ink-3">{p.field.name} · {formatWindow(p.estimatedHarvestStart, p.estimatedHarvestEnd)}</div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function FieldStatusPanel({ fields, className }: { fields: DashboardSummary['fieldStatus']; className?: string }) {
  return (
    <Card className={clsx('md:col-span-2 lg:col-span-4', className)}>
      <CardHeader title="Field status" subtitle={`${plural(fields.length, 'field')} across your farms`} action={<Link to="/app/farms" className="text-[13px] font-medium text-ink-2 hover:text-ink">Manage</Link>} />
      <ul className="mt-3 grid grid-cols-1 gap-2 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-1">
        {fields.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium text-ink">{f.name}</div>
              <div className="truncate text-[12px] text-ink-3">{f.crops.length ? f.crops.join(', ') : 'Idle'}{f.areaAcres ? ` · ${f.areaAcres} ac` : ''}</div>
            </div>
            {f.activePlantings > 0 ? <RiskBadge level={f.risk} /> : <span className="text-[12.5px] text-ink-3">Available</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

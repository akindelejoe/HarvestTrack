import { History } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { HarvestsByMonthChart } from '@/components/charts/WeatherCharts';
import { StatusBadge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useHarvestHistory } from '@/hooks/queries';
import { formatDate, formatNumber, formatWindow, QUALITY_LABEL, UNIT_LABEL } from '@/lib/format';
import type { Planting } from '@/types';

const yieldLabel = (p: Planting) => (p.harvest ? `${formatNumber(p.harvest.quantity, 2)} ${UNIT_LABEL[p.harvest.unit]}` : '—');

export default function HarvestHistoryPage() {
  const [season, setSeason] = useState<number | undefined>();
  const { data, isLoading, error, refetch, isFetching } = useHarvestHistory(season);

  return (
    <>
      <PageHeader
        title="Harvest History"
        description="Plantings and recorded harvests by growing season, compared against their estimated windows."
        actions={
          data && (
            <label className="flex items-center gap-2 text-[13px] text-ink-3">
              Season
              <select
                value={data.season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="h-9 rounded-lg border border-line bg-surface px-3 text-[13.5px] font-medium text-ink focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
              >
                {data.seasons.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )
        }
      />
      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : error || !data ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : data.records.length === 0 ? (
        <Card><EmptyState icon={<History className="h-5 w-5" />} title="No records for this season" description="Harvests you record will appear here, grouped by season." /></Card>
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : ''}>
          <section aria-label="Season summary" className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              ['Plantings', data.stats.plantings, `${data.season} season`],
              ['Harvested', data.stats.harvested, `${data.stats.plantings ? Math.round((data.stats.harvested / data.stats.plantings) * 100) : 0}% of plantings`],
              ['Failed', data.stats.failed, data.stats.failed ? 'Recorded crop losses' : 'No losses recorded'],
              ['Timing vs. estimate', data.stats.avgDaysFromEstimate === null ? '—' : `${data.stats.avgDaysFromEstimate > 0 ? '+' : ''}${data.stats.avgDaysFromEstimate}d`, 'Avg. from window start'],
            ].map(([k, v, note]) => (
              <Card key={k} className="p-4 sm:p-5">
                <div className="text-[13px] text-ink-3">{k}</div>
                <div className="num mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink">{v}</div>
                <div className="mt-1 text-[12px] text-ink-3">{note}</div>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader title={`${data.season} season`} subtitle={`${data.records.length} planting record${data.records.length === 1 ? '' : 's'}`} />
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13.5px]">
                <caption className="sr-only">Harvest history for {data.season}</caption>
                <thead>
                  <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.06em] text-ink-3">
                    {['Crop', 'Farm', 'Field', 'Planting date', 'Est. harvest', 'Actual harvest', 'Yield', 'Status'].map((h, i) => (
                      <th key={h} scope="col" className={`py-2.5 font-medium ${i === 0 ? 'pr-3 pl-5' : 'px-3'} ${h === 'Yield' ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((p) => (
                    <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-surface-2/60">
                      <td className="py-3 pr-3 pl-5">
                        <Link to={`/app/crops/${p.id}`} className="font-medium text-ink hover:underline">{p.crop.name}</Link>
                        {p.variety && <div className="text-[12px] text-ink-3">{p.variety}</div>}
                      </td>
                      <td className="px-3 py-3 text-ink-2">{p.farm.name}</td>
                      <td className="px-3 py-3 text-ink-2">{p.field.name}</td>
                      <td className="num px-3 py-3 text-ink-2">{formatDate(p.plantingDate)}</td>
                      <td className="num px-3 py-3 text-ink-2">{formatWindow(p.estimatedHarvestStart, p.estimatedHarvestEnd)}</td>
                      <td className="num px-3 py-3 text-ink">{p.harvest ? formatDate(p.harvest.actualHarvestDate) : '—'}</td>
                      <td className="num px-3 py-3 text-right font-medium text-ink">
                        {yieldLabel(p)}
                        {p.harvest && <div className="text-[12px] font-normal text-ink-3">{QUALITY_LABEL[p.harvest.quality]}</div>}
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={p.displayStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 divide-y divide-line md:hidden">
              {data.records.map((p) => (
                <li key={p.id}>
                  <Link to={`/app/crops/${p.id}`} className="block px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-ink">{p.crop.name}</div>
                        <div className="text-[12.5px] text-ink-3">{p.field.name} · {p.farm.name}</div>
                      </div>
                      <StatusBadge status={p.displayStatus} />
                    </div>
                    <dl className="num mt-3 grid grid-cols-2 gap-y-1 text-[12.5px]">
                      <dt className="text-ink-3">Planted</dt><dd className="text-right text-ink-2">{formatDate(p.plantingDate)}</dd>
                      <dt className="text-ink-3">Harvested</dt><dd className="text-right text-ink-2">{p.harvest ? formatDate(p.harvest.actualHarvestDate) : '—'}</dd>
                      <dt className="text-ink-3">Yield</dt><dd className="text-right font-medium text-ink">{yieldLabel(p)}</dd>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {data.stats.harvestsByMonth.length > 1 && (
            <Card className="mt-5">
              <CardHeader title="Harvests by month" subtitle={`${data.season} season`} />
              <div className="p-5"><HarvestsByMonthChart data={data.stats.harvestsByMonth} /></div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

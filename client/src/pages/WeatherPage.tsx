import { CloudSun, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { RainfallChart, TemperatureChart } from '@/components/charts/WeatherCharts';
import { CurrentConditions, ForecastStrip } from '@/components/weather/WeatherPanels';
import { buttonClass } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { useWeather } from '@/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { formatDate } from '@/lib/format';

export default function WeatherPage() {
  const [farmId, setFarmId] = useState<string | undefined>();
  const { data, isLoading, error, refetch, isFetching } = useWeather(farmId);
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await api.get(`/weather?refresh=true${farmId ? `&farmId=${farmId}` : ''}`);
      qc.setQueryData(['weather', farmId ?? 'default'], fresh);
    } catch {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const w = data?.weather;
  const totalRain = w?.daily.reduce((s, d) => s + d.precipitationMm, 0) ?? 0;
  const wettest = w?.daily.reduce((a, b) => (b.precipitationMm > a.precipitationMm ? b : a));

  return (
    <>
      <PageHeader
        title="Weather"
        description="Current conditions and the 7-day outlook used by hazard detection."
        actions={
          data?.farms.length ? (
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="farm-select">Farm</label>
              <select
                id="farm-select"
                value={farmId ?? w?.farm.id ?? ''}
                onChange={(e) => setFarmId(e.target.value)}
                className="h-10 rounded-lg border border-line bg-surface px-3 text-[13.5px] font-medium text-ink focus:border-focus focus:ring-2 focus:ring-focus/30 focus:outline-none"
              >
                {data.farms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <button onClick={refresh} disabled={refreshing || isFetching} className={buttonClass('secondary')} aria-label="Refresh forecast">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span className="max-sm:hidden">Refresh</span>
              </button>
            </div>
          ) : null
        }
      />
      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl lg:col-span-2" /></div>
      ) : error ? (
        <Card><ErrorState title="Weather data unavailable" error={error} onRetry={() => refetch()} /></Card>
      ) : !w ? (
        <Card><EmptyState icon={<CloudSun className="h-5 w-5" />} title="No farm location yet" description="Weather is tied to a farm's location. Add a farm to see its forecast." action={<Link to="/app/farms" className={buttonClass('primary', 'sm')}>Add a farm</Link>} /></Card>
      ) : (
        <div className="space-y-5 lg:space-y-6">
          <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
            <Card className="p-5 lg:col-span-4">
              <CurrentConditions weather={w} variant="hero" />
            </Card>
            <Card className="lg:col-span-8">
              <CardHeader title="Temperature" subtitle="Daily high and low, °C" />
              <div className="px-3 pt-3 pb-4 sm:px-5"><TemperatureChart days={w.daily} height={250} /></div>
            </Card>
          </div>
          <Card className="p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-ink">7-day forecast</h2>
            <ForecastStrip weather={w} />
          </Card>
          <Card>
            <CardHeader
              title="Rainfall"
              subtitle={`${totalRain.toFixed(1)} mm expected over 7 days${wettest && wettest.precipitationMm > 0 ? ` · wettest ${formatDate(wettest.date, { year: false })}` : ''}`}
            />
            {totalRain > 0 ? (
              <div className="px-3 pt-3 pb-4 sm:px-5"><RainfallChart days={w.daily} height={200} /></div>
            ) : (
              <p className="px-5 pt-3 pb-6 text-[13.5px] text-ink-3">No measurable rain is forecast this week. Keep an eye on soil moisture for drought-sensitive crops.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

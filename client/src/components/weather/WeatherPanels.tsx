import clsx from 'clsx';
import { Droplets, MapPin, Umbrella, Wind } from 'lucide-react';
import { relativeTime, weekday } from '@/lib/format';
import type { Weather } from '@/types';
import { CONDITION_LABEL, WeatherIcon } from './WeatherIcon';

export function CurrentConditions({ weather, variant = 'card' }: { weather: Weather; variant?: 'card' | 'hero' }) {
  const c = weather.current;
  const stats = [
    { icon: Droplets, label: 'Humidity', value: `${Math.round(c.humidity)}%` },
    { icon: Umbrella, label: 'Rain chance', value: `${Math.round(c.precipitationProbability)}%` },
    { icon: Wind, label: 'Wind', value: `${Math.round(c.windSpeedKph)} km/h` },
  ];
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate">{weather.farm.name} · {weather.farm.location}</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <WeatherIcon condition={c.condition} className={clsx('shrink-0 text-slate', variant === 'hero' ? 'h-14 w-14' : 'h-11 w-11')} strokeWidth={1.5} />
        <div>
          <div className={clsx('num font-semibold tracking-[-0.04em] text-ink', variant === 'hero' ? 'text-5xl' : 'text-[40px] leading-none')}>
            {Math.round(c.temperatureC)}°<span className="text-ink-3 text-[0.55em] font-medium">C</span>
          </div>
          <div className="mt-1 text-[13.5px] text-ink-2">{CONDITION_LABEL[c.condition]}</div>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-soft/70 px-3 py-2.5">
            <dt className="flex items-center gap-1 text-[11.5px] text-ink-3">
              <s.icon className="h-3.5 w-3.5 text-slate" aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="num mt-0.5 text-[15px] font-semibold text-ink">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11.5px] text-ink-3">
        {weather.stale ? 'Live data unavailable — showing last saved forecast · ' : ''}Updated {relativeTime(weather.fetchedAt)} · {weather.provider}
      </p>
    </div>
  );
}

export function ForecastStrip({ weather }: { weather: Weather }) {
  return (
    <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-7" aria-label="7-day forecast">
      {weather.daily.map((d, i) => (
        <li key={d.date} className={clsx('rounded-xl border px-2 py-3 text-center', i === 0 ? 'border-slate/30 bg-slate-soft/60' : 'border-line bg-surface')}>
          <div className="text-[12px] font-medium text-ink-2">{i === 0 ? 'Today' : weekday(d.date)}</div>
          <WeatherIcon condition={d.condition} className="mx-auto my-2 h-6 w-6 text-slate" strokeWidth={1.6} />
          <div className="num text-[13.5px] font-semibold text-ink">{Math.round(d.tempMaxC)}°</div>
          <div className="num text-[12px] text-ink-3">{Math.round(d.tempMinC)}°</div>
          <div className="num mt-1.5 flex items-center justify-center gap-0.5 text-[11px] text-slate">
            <Droplets className="h-3 w-3" aria-hidden="true" />
            {Math.round(d.precipitationProbability)}%
          </div>
        </li>
      ))}
    </ol>
  );
}

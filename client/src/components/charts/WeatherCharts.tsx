import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '@/hooks/useTheme';
import { formatDate, formatMonth, weekday } from '@/lib/format';
import type { ForecastDay } from '@/types';
import { TooltipShell } from './ChartTooltip';

const axisProps = (color: string) => ({
  tick: { fill: color, fontSize: 12 },
  tickLine: false,
  axisLine: false,
});

/** 7-day high/low. Two series → legend + direct end labels; one y-axis. */
export function TemperatureChart({ days, height = 220 }: { days: ForecastDay[]; height?: number }) {
  const { chart } = useTheme();
  const [lowColor, highColor] = [chart.series[0], chart.series[1]];
  const data = days.map((d) => ({ ...d, label: weekday(d.date) }));
  const last = data.length - 1;
  const lo = Math.floor(Math.min(...days.map((d) => d.tempMinC)) / 5) * 5;
  const hi = Math.ceil(Math.max(...days.map((d) => d.tempMaxC)) / 5) * 5;
  const ticks = Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5);

  return (
    <figure>
      <div className="mb-2 flex items-center gap-4 text-[12px] text-ink-2" aria-hidden="true">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: highColor }} />High</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: lowColor }} />Low</span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 36, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke={chart.grid} />
            <XAxis dataKey="label" {...axisProps(chart.axis)} dy={6} />
            <YAxis {...axisProps(chart.axis)} unit="°" width={44} domain={[lo, hi]} ticks={ticks} allowDecimals={false} />
            <Tooltip
              cursor={{ stroke: chart.line, strokeWidth: 1 }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipShell
                    title={formatDate((payload[0].payload as ForecastDay).date)}
                    rows={[
                      { color: highColor, label: 'High', value: `${(payload[0].payload as ForecastDay).tempMaxC.toFixed(1)}°C` },
                      { color: lowColor, label: 'Low', value: `${(payload[0].payload as ForecastDay).tempMinC.toFixed(1)}°C` },
                    ]}
                  />
                ) : null
              }
            />
            {(['tempMaxC', 'tempMinC'] as const).map((key) => {
              const color = key === 'tempMaxC' ? highColor : lowColor;
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: color, stroke: chart.surface, strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: color, stroke: chart.surface, strokeWidth: 2 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey={key}
                    content={({ x, y, index, value }) =>
                      index === last ? (
                        <text x={Number(x) + 10} y={Number(y) + 4} fill={chart.ink2} fontSize={12} fontWeight={500}>
                          {Math.round(Number(value))}°
                        </text>
                      ) : null
                    }
                  />
                </Line>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        7-day temperature forecast: {days.map((d) => `${weekday(d.date, false)} high ${Math.round(d.tempMaxC)}, low ${Math.round(d.tempMinC)}`).join('; ')}.
      </figcaption>
    </figure>
  );
}

/** Daily rainfall totals (single series, no legend). */
export function RainfallChart({ days, height = 180 }: { days: ForecastDay[]; height?: number }) {
  const { chart } = useTheme();
  const data = days.map((d) => ({ ...d, label: weekday(d.date) }));
  return (
    <figure style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: -12 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={chart.grid} />
          <XAxis dataKey="label" {...axisProps(chart.axis)} dy={6} />
          <YAxis {...axisProps(chart.axis)} unit=" mm" width={56} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: chart.grid, opacity: 0.5 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipShell
                  title={formatDate((payload[0].payload as ForecastDay).date)}
                  rows={[
                    { color: chart.series[0], label: 'Rainfall', value: `${(payload[0].payload as ForecastDay).precipitationMm.toFixed(1)} mm` },
                    { color: chart.axis, label: 'Chance', value: `${Math.round((payload[0].payload as ForecastDay).precipitationProbability)}%` },
                  ]}
                />
              ) : null
            }
          />
          <Bar dataKey="precipitationMm" fill={chart.series[0]} radius={[4, 4, 0, 0]} isAnimationActive={false} minPointSize={1} />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">Daily rainfall forecast in millimetres: {days.map((d) => `${weekday(d.date, false)} ${d.precipitationMm} mm`).join('; ')}.</figcaption>
    </figure>
  );
}

/** Harvests per month (single series). */
export function HarvestsByMonthChart({ data, height = 180 }: { data: { month: string; count: number }[]; height?: number }) {
  const { chart } = useTheme();
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  const max = Math.max(...data.map((d) => d.count), 0);
  return (
    <figure style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 18, right: 4, bottom: 0, left: -24 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={chart.grid} />
          <XAxis dataKey="label" {...axisProps(chart.axis)} dy={6} interval="preserveStartEnd" />
          <YAxis {...axisProps(chart.axis)} allowDecimals={false} width={44} domain={[0, Math.max(2, max)]} />
          <Tooltip
            cursor={{ fill: chart.grid, opacity: 0.5 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipShell
                  title={formatMonth((payload[0].payload as { month: string }).month, true)}
                  rows={[{ color: chart.series[3], label: 'Harvests', value: (payload[0].payload as { count: number }).count }]}
                />
              ) : null
            }
          />
          <Bar dataKey="count" fill={chart.series[3]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="sr-only">Harvests recorded per month: {data.map((d) => `${formatMonth(d.month, true)}: ${d.count}`).join('; ')}.</figcaption>
    </figure>
  );
}

import { fetchJson } from './http.js';
import type { ForecastDay, WeatherCondition, WeatherProvider, WeatherReport } from './types.js';

/**
 * OpenWeatherMap (free tier): current weather + 5-day / 3-hour forecast,
 * aggregated into daily buckets in the location's local time.
 */
export class OpenWeatherMapProvider implements WeatherProvider {
  readonly name = 'openweathermap';

  constructor(private readonly apiKey: string) {}

  async getForecast(lat: number, lon: number): Promise<WeatherReport> {
    const qs = `lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(this.apiKey)}`;
    const [current, forecast] = await Promise.all([
      fetchJson<OwmCurrent>(`https://api.openweathermap.org/data/2.5/weather?${qs}`),
      fetchJson<OwmForecast>(`https://api.openweathermap.org/data/2.5/forecast?${qs}`),
    ]);

    const offset = forecast.city.timezone; // seconds from UTC
    const buckets = new Map<string, OwmForecast['list']>();
    for (const item of forecast.list) {
      const localDate = new Date((item.dt + offset) * 1000).toISOString().slice(0, 10);
      buckets.set(localDate, [...(buckets.get(localDate) ?? []), item]);
    }

    const daily: ForecastDay[] = [...buckets.entries()].map(([date, items]) => {
      const precip = items.reduce((s, i) => s + (i.rain?.['3h'] ?? 0) + (i.snow?.['3h'] ?? 0), 0);
      const worst = items.reduce((a, b) => (severityOf(b.weather[0].id) > severityOf(a.weather[0].id) ? b : a));
      return {
        date,
        condition: owmToCondition(worst.weather[0].id),
        tempMinC: Math.min(...items.map((i) => i.main.temp_min)),
        tempMaxC: Math.max(...items.map((i) => i.main.temp_max)),
        precipitationMm: Math.round(precip * 10) / 10,
        precipitationProbability: Math.round(Math.max(...items.map((i) => i.pop)) * 100),
        windSpeedMaxKph: Math.round(Math.max(...items.map((i) => i.wind.speed)) * 3.6),
        windGustsMaxKph: Math.round(Math.max(...items.map((i) => i.wind.gust ?? i.wind.speed)) * 3.6),
      };
    });

    return {
      provider: this.name,
      current: {
        temperatureC: current.main.temp,
        humidity: current.main.humidity,
        windSpeedKph: Math.round(current.wind.speed * 3.6),
        condition: owmToCondition(current.weather[0].id),
        precipitationProbability: daily[0]?.precipitationProbability ?? 0,
      },
      daily: daily.slice(0, 7),
    };
  }
}

function owmToCondition(id: number): WeatherCondition {
  if (id >= 200 && id < 300) return 'thunderstorm';
  if (id >= 300 && id < 400) return 'drizzle';
  if (id === 502 || id === 503 || id === 504 || id === 522) return 'heavy-rain';
  if (id >= 500 && id < 600) return 'rain';
  if (id >= 600 && id < 700) return 'snow';
  if (id >= 700 && id < 800) return 'fog';
  if (id === 800 || id === 801) return 'clear';
  if (id === 802) return 'partly-cloudy';
  return 'cloudy';
}

const severityOf = (id: number) => (id < 300 ? 5 : id < 600 ? 4 : id < 700 ? 3 : id < 800 ? 2 : id === 800 ? 0 : 1);

interface OwmCurrent {
  main: { temp: number; humidity: number };
  wind: { speed: number };
  weather: { id: number }[];
}
interface OwmForecast {
  city: { timezone: number };
  list: {
    dt: number;
    main: { temp_min: number; temp_max: number };
    wind: { speed: number; gust?: number };
    pop: number;
    rain?: { '3h'?: number };
    snow?: { '3h'?: number };
    weather: { id: number }[];
  }[];
}

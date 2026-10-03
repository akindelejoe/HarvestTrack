import { fetchJson } from './http.js';
import type { WeatherCondition, WeatherProvider, WeatherReport } from './types.js';

/** Open-Meteo — free, keyless forecast API (https://open-meteo.com). */
export class OpenMeteoProvider implements WeatherProvider {
  readonly name = 'open-meteo';

  async getForecast(lat: number, lon: number): Promise<WeatherReport> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
      ].join(','),
      timezone: 'auto',
      forecast_days: '7',
      wind_speed_unit: 'kmh',
    });
    const data = await fetchJson<OpenMeteoResponse>(`https://api.open-meteo.com/v1/forecast?${params}`);
    const d = data.daily;

    return {
      provider: this.name,
      current: {
        temperatureC: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeedKph: data.current.wind_speed_10m,
        condition: wmoToCondition(data.current.weather_code),
        precipitationProbability: d.precipitation_probability_max[0] ?? 0,
      },
      daily: d.time.map((date, i) => ({
        date,
        condition: wmoToCondition(d.weather_code[i]),
        tempMinC: d.temperature_2m_min[i],
        tempMaxC: d.temperature_2m_max[i],
        precipitationMm: d.precipitation_sum[i] ?? 0,
        precipitationProbability: d.precipitation_probability_max[i] ?? 0,
        windSpeedMaxKph: d.wind_speed_10m_max[i] ?? 0,
        windGustsMaxKph: d.wind_gusts_10m_max[i] ?? d.wind_speed_10m_max[i] ?? 0,
      })),
    };
  }
}

/** WMO weather interpretation codes → normalised condition. */
export function wmoToCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code === 65 || code === 67 || code === 82) return 'heavy-rain';
  if ((code >= 61 && code <= 66) || code === 80 || code === 81) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'cloudy';
}

interface OpenMeteoResponse {
  current: { temperature_2m: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: (number | null)[];
    wind_gusts_10m_max: (number | null)[];
  };
}

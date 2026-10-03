import type { ForecastDay, WeatherProvider, WeatherReport } from './types.js';

/**
 * Deterministic offline provider for demos, tests and development without network.
 * Generates a plausible week that includes a near-frost night and a heavy-rain day
 * so the hazard pipeline has something to show.
 */
export class MockWeatherProvider implements WeatherProvider {
  readonly name = 'mock';

  async getForecast(lat: number, lon: number): Promise<WeatherReport> {
    const seed = Math.abs(Math.round(lat * 7 + lon * 3)) % 5;
    const today = new Date();
    const daily: ForecastDay[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
      const base = 21 + seed + Math.sin(i / 1.5) * 4;
      const heavyRain = i === 1;
      const coldNight = i === 3;
      return {
        date: date.toISOString().slice(0, 10),
        condition: heavyRain ? 'heavy-rain' : coldNight ? 'clear' : i % 3 === 2 ? 'partly-cloudy' : 'clear',
        tempMaxC: round(base + 6),
        tempMinC: coldNight ? 1.5 : round(base - 6),
        precipitationMm: heavyRain ? 38 : i === 2 ? 4 : 0,
        precipitationProbability: heavyRain ? 90 : i === 2 ? 45 : 10,
        windSpeedMaxKph: heavyRain ? 34 : 14 + i,
        windGustsMaxKph: heavyRain ? 52 : 22 + i,
      };
    });
    return {
      provider: this.name,
      current: {
        temperatureC: round(daily[0].tempMaxC - 3),
        condition: 'partly-cloudy',
        humidity: 62,
        windSpeedKph: 12,
        precipitationProbability: daily[0].precipitationProbability,
      },
      daily,
    };
  }
}

const round = (n: number) => Math.round(n * 10) / 10;

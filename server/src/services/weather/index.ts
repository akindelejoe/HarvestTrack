import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { MockWeatherProvider } from './mockProvider.js';
import { OpenMeteoProvider } from './openMeteoProvider.js';
import { OpenWeatherMapProvider } from './openWeatherMapProvider.js';
import type { WeatherProvider } from './types.js';

export function createWeatherProvider(): WeatherProvider {
  if (env.NODE_ENV === 'test' || env.WEATHER_PROVIDER === 'mock') return new MockWeatherProvider();
  if (env.WEATHER_PROVIDER === 'openweathermap') {
    if (env.WEATHER_API_KEY) return new OpenWeatherMapProvider(env.WEATHER_API_KEY);
    logger.warn('weather', 'WEATHER_PROVIDER=openweathermap but WEATHER_API_KEY is empty; using Open-Meteo.');
  }
  return new OpenMeteoProvider();
}

export * from './types.js';

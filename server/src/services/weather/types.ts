/** Normalised weather model shared by every provider. Metric units throughout. */
export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'snow'
  | 'thunderstorm';

export interface ForecastDay {
  date: string; // YYYY-MM-DD (farm local date)
  condition: WeatherCondition;
  tempMinC: number;
  tempMaxC: number;
  precipitationMm: number;
  precipitationProbability: number; // 0–100
  windSpeedMaxKph: number;
  windGustsMaxKph: number;
}

export interface CurrentConditions {
  temperatureC: number;
  condition: WeatherCondition;
  humidity: number; // %
  windSpeedKph: number;
  precipitationProbability: number; // today's max, 0–100
}

export interface WeatherReport {
  provider: string;
  current: CurrentConditions;
  daily: ForecastDay[];
}

export interface WeatherProvider {
  readonly name: string;
  getForecast(lat: number, lon: number): Promise<WeatherReport>;
}

export class WeatherProviderError extends Error {}

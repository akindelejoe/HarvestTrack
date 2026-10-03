import type { Farm } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { createWeatherProvider, type WeatherReport } from './weather/index.js';

const provider = createWeatherProvider();

export interface FarmWeather extends WeatherReport {
  farm: { id: string; name: string; location: string };
  fetchedAt: string;
  /** True when the live provider failed and a cached snapshot is being served. */
  stale: boolean;
}

/**
 * Returns the forecast for a farm, served from the weather_snapshots cache when
 * fresh enough. On provider failure, falls back to the most recent snapshot.
 */
export async function getFarmWeather(farm: Farm, opts: { forceRefresh?: boolean } = {}): Promise<FarmWeather> {
  const latest = await prisma.weatherSnapshot.findFirst({
    where: { farmId: farm.id },
    orderBy: { fetchedAt: 'desc' },
  });
  const maxAgeMs = env.WEATHER_CACHE_MINUTES * 60_000;
  const fresh = latest && Date.now() - latest.fetchedAt.getTime() < maxAgeMs && latest.provider === provider.name;

  if (latest && fresh && !opts.forceRefresh) return fromSnapshot(farm, latest, false);

  try {
    const report = await provider.getForecast(Number(farm.latitude), Number(farm.longitude));
    const snapshot = await prisma.weatherSnapshot.create({
      data: {
        farmId: farm.id,
        provider: report.provider,
        temperatureC: report.current.temperatureC,
        humidity: Math.round(report.current.humidity),
        windSpeedKph: report.current.windSpeedKph,
        condition: report.current.condition,
        forecast: report as unknown as object,
      },
    });
    return fromSnapshot(farm, snapshot, false);
  } catch (err) {
    logger.warn('weather', `Forecast fetch failed for farm ${farm.id}`, { error: (err as Error).message });
    if (latest) return fromSnapshot(farm, latest, true);
    throw AppError.unavailable(
      'Weather data is temporarily unavailable. Your crop records are unaffected — please try again shortly.',
      'WEATHER_UNAVAILABLE',
    );
  }
}

function fromSnapshot(
  farm: Farm,
  snapshot: { forecast: unknown; fetchedAt: Date },
  stale: boolean,
): FarmWeather {
  const report = snapshot.forecast as WeatherReport;
  return {
    ...report,
    farm: { id: farm.id, name: farm.name, location: farm.location },
    fetchedAt: snapshot.fetchedAt.toISOString(),
    stale,
  };
}

/** Keeps the snapshot table bounded: retains the last N snapshots per farm. */
export async function pruneSnapshots(keepPerFarm = 50): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM weather_snapshots ws
    USING (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY farm_id ORDER BY fetched_at DESC) AS rn
        FROM weather_snapshots
      ) ranked WHERE rn > ${keepPerFarm}
    ) old
    WHERE ws.id = old.id`;
}

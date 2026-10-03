import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  label: string;
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/**
 * Resolves "Columbus, Ohio" style text into coordinates via the Open-Meteo
 * geocoding API (keyless). Qualifiers after the first comma narrow the match.
 */
export async function geocode(location: string): Promise<GeoPoint> {
  if (env.NODE_ENV === 'test' || env.WEATHER_PROVIDER === 'mock') {
    return { latitude: 40.0, longitude: -83.0, label: location };
  }

  const [place, ...qualifiers] = location.split(',').map((s) => s.trim()).filter(Boolean);
  const url = `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: place ?? '', count: '10', language: 'en' })}`;

  let results: GeoResult[];
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    results = ((await res.json()) as { results?: GeoResult[] }).results ?? [];
  } catch {
    throw AppError.unavailable(
      'Location lookup is unavailable right now. Enter latitude and longitude manually or try again later.',
      'GEOCODING_UNAVAILABLE',
    );
  }

  const wanted = qualifiers.map((q) => q.toLowerCase());
  const match =
    results.find((r) =>
      wanted.every((q) => [r.admin1, r.country].some((v) => v?.toLowerCase().includes(q) || q.includes(v?.toLowerCase() ?? '#'))),
    ) ?? (wanted.length === 0 ? results[0] : undefined);

  if (!match) {
    throw AppError.unprocessable(
      `We couldn't find "${location}". Try "City, Region" or enter coordinates manually.`,
      'INVALID_LOCATION',
    );
  }
  return {
    latitude: match.latitude,
    longitude: match.longitude,
    label: [match.name, match.admin1, match.country].filter(Boolean).join(', '),
  };
}

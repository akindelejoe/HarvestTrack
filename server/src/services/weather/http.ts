import { WeatherProviderError } from './types.js';

export async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    throw new WeatherProviderError(`Weather service unreachable: ${(err as Error).message}`);
  }
  if (!res.ok) throw new WeatherProviderError(`Weather service responded with HTTP ${res.status}`);
  return (await res.json()) as T;
}

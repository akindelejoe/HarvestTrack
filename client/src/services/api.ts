/** Thin fetch wrapper: same-origin cookies, JSON in/out, typed errors. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
  get isAuthError() {
    return this.status === 401;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

let onUnauthorized: (() => void) | null = null;
/** Registered by AuthProvider so an expired session anywhere redirects to login. */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Unable to reach HarvestTrack. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = data?.error ?? {};
    const apiError = new ApiError(
      res.status,
      err.code ?? 'ERROR',
      err.message ?? (res.status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed.'),
      err.details && typeof err.details === 'object' ? err.details : {},
    );
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();
    throw apiError;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

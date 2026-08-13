import AsyncStorage from '@react-native-async-storage/async-storage';

// Both web and native talk to the deployed backend so testing doesn't depend on a local
// server or being on the same Wi-Fi network as the dev machine.
export const API_BASE = 'https://model-restaurant-app.onrender.com';
// Free-tier Render sleeps after 15min idle — first request after that can take 30-50s to wake up.

// Images (menu photos, QR codes, loyalty reveal images) live on Cloudflare R2, not on the API server.
const R2_PUBLIC_URL = 'https://pub-513378f884254cda99fd7ba503339c18.r2.dev';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  isForm?: boolean;
};

export async function apiRequest<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.isForm) {
      body = opts.body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { method: opts.method ?? 'GET', headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || `request_failed_${res.status}`;
    throw Object.assign(new Error(message), { data, status: res.status });
  }
  return data;
}

export function imageUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${R2_PUBLIC_URL}${path}`;
}

const CACHE_PREFIX = 'beem_cache_';

async function getCachedJson<T = any>(path: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setCachedJson(path: string, data: unknown) {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
  } catch {
    // best-effort cache; ignore storage failures
  }
}

// Stale-while-revalidate GET: calls onData immediately with any cached response
// (so the screen can paint right away instead of waiting on a slow/cold backend),
// then fetches fresh data and calls onData again once it arrives.
export function apiRequestCached<T = any>(path: string, onData: (data: T) => void): void {
  getCachedJson<T>(path).then((cached) => {
    if (cached) onData(cached);
  });
  apiRequest<T>(path).then((fresh) => {
    onData(fresh);
    setCachedJson(path, fresh);
  });
}

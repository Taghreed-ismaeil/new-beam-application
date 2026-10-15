import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Both web and native talk to the deployed backend so testing doesn't depend on a local
// server or being on the same Wi-Fi network as the dev machine.
// EXPO_PUBLIC_API_BASE (e.g. in a gitignored .env.local) points a dev build at a local backend.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "https://model-restaurant-app.onrender.com";
// Free-tier Render sleeps after 15min idle — first request after that can take 30-50s to wake up.

// Images (menu photos, QR codes, loyalty reveal images) live on Cloudflare R2, not on the API server.
// A local backend (R2_ACCOUNT_ID=local) serves images itself and forwards the rest to R2.
const R2_PUBLIC_URL = process.env.EXPO_PUBLIC_IMAGE_BASE || "https://pub-513378f884254cda99fd7ba503339c18.r2.dev";

// Kept separate (rather than one shared token) because a device can have both
// a customer session (AuthContext) and a staff session (StaffContext) active
// at once — e.g. testing the admin panel and the customer app side by side.
// A single shared token meant whichever session restored/logged in last won,
// silently sending the wrong token's Bearer header on the other session's
// requests (customer screens getting 403 "forbidden" from requireUser after
// signing into the admin panel, or vice versa).
let customerToken: string | null = null;
let staffToken: string | null = null;

function isStaffPath(path: string): boolean {
  return path.startsWith("/api/admin") || path.startsWith("/api/staff");
}

export function setAuthToken(token: string | null) {
  customerToken = token;
}

export function getAuthToken(): string | null {
  return customerToken;
}

export function setStaffAuthToken(token: string | null) {
  staffToken = token;
}

export function getStaffAuthToken(): string | null {
  return staffToken;
}

// AuthProvider/StaffProvider register their own logout() here on mount. A 401
// means the stored session is no longer valid (expired token, or the account
// it points to is gone) — clearing it lets the redirect-to-login logic take
// over, instead of every screen having to know how to recover from this itself.
let onUnauthorized: (() => void) | null = null;
let onStaffUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export function setStaffUnauthorizedHandler(handler: (() => void) | null) {
  onStaffUnauthorized = handler;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  isForm?: boolean;
};

export async function apiRequest<T = any>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = isStaffPath(path) ? staffToken : customerToken;
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.isForm) {
      body = opts.body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
  }

  let status: number;
  let data: any;
  if (opts.isForm && Platform.OS !== "web") {
    // On phones Expo swaps the global fetch for expo/fetch, whose FormData can't send
    // React Native's { uri, name, type } file parts ("uri is not supported") — so photo
    // uploads failed on the phone while working on the web. React Native's own
    // XMLHttpRequest still streams those parts straight from the file.
    ({ status, data } = await xhrRequest(`${API_BASE}${path}`, opts.method ?? "POST", headers, body));
  } else {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });
    status = res.status;
    data = await res.json().catch(() => ({}));
  }

  if (status < 200 || status >= 300) {
    if (status === 401) {
      if (isStaffPath(path)) onStaffUnauthorized?.();
      else onUnauthorized?.();
    }
    const message =
      data?.message || data?.error || `request_failed_${status}`;
    throw Object.assign(new Error(message), { data, status });
  }
  return data;
}

function xhrRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: BodyInit | undefined,
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        // non-JSON error page — keep {}
      }
      resolve({ status: xhr.status, data });
    };
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"));
    xhr.send(body as any);
  });
}

/**
 * True for an image path the app can actually load: a full URL or a server
 * path ("/uploads/…", "/images/…"). A file path from someone's own computer
 * typed straight into the database ("C:\Users\…\extras.png") is not — callers
 * should fall back to their bundled image instead of showing a blank.
 */
export function isUsableImagePath(path?: string | null): path is string {
  return !!path && (path.startsWith("http") || path.startsWith("/"));
}

export function imageUrl(path?: string | null): string {
  if (!isUsableImagePath(path)) return "";
  if (path.startsWith("http")) return path;
  return `${R2_PUBLIC_URL}${path}`;
}

const CACHE_PREFIX = "beem_cache_";

// In-memory layer over the AsyncStorage cache: screens that mount after the first
// fetch (home → menu → category → cart all read /api/menu) paint synchronously-fast
// instead of re-reading storage, and concurrent callers share one network request.
const memoryCache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
// Responses younger than this are reused without hitting the network again.
const FRESH_MS = 30_000;
const fetchedAt = new Map<string, number>();

async function getCachedJson<T = any>(path: string): Promise<T | null> {
  if (memoryCache.has(path)) return memoryCache.get(path) as T;
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + path);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function setCachedJson(path: string, data: unknown) {
  memoryCache.set(path, data);
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
  } catch {
    // best-effort cache; ignore storage failures
  }
}

// Stale-while-revalidate GET: calls onData immediately with any cached response
// (so the screen can paint right away instead of waiting on a slow/cold backend),
// then fetches fresh data and calls onData again once it arrives.
// A failed refresh (offline, server asleep/down) must not surface as an uncaught error — the
// screen keeps whatever it already painted from cache; pass onError to react to it explicitly.
type CachedRequestOptions = {
  /** Memory/storage key, defaults to the path. Per-user endpoints (loyalty
   *  progress, vouchers) include the user id so accounts never share cache. */
  cacheKey?: string;
  /** Always refresh from the network, even inside the FRESH_MS window. */
  revalidate?: boolean;
};

export function apiRequestCached<T = any>(
  path: string,
  onData: (data: T) => void,
  onError?: (error: unknown) => void,
  opts: CachedRequestOptions = {},
): void {
  const key = opts.cacheKey ?? path;
  let gotFresh = false;
  const memo = memoryCache.get(key) as T | undefined;
  if (memo) onData(memo);
  else
    getCachedJson<T>(key).then((cached) => {
      // storage can resolve after the network on a warm server — never paint stale over fresh
      if (cached && !gotFresh) onData(cached);
    });

  if (!opts.revalidate && memo && Date.now() - (fetchedAt.get(key) ?? 0) < FRESH_MS) return;

  let request = inflight.get(key) as Promise<T> | undefined;
  if (!request) {
    request = apiRequest<T>(path)
      .then((fresh) => {
        fetchedAt.set(key, Date.now());
        setCachedJson(key, fresh);
        return fresh;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, request);
  }
  request
    .then((fresh) => {
      gotFresh = true;
      if (fresh !== memo) onData(fresh);
    })
    .catch((error) => {
      if (onError) onError(error);
      else console.warn(`[api] refresh of ${path} failed, keeping cached data`, error);
    });
}

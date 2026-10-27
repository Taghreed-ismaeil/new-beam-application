import { useEffect, useState, useSyncExternalStore } from "react";

import { apiRequest, getAuthToken } from "@/lib/api-client";

let offers = [];
// server clock minus ours, so a phone with a wrong clock still counts down right
let skew = 0;
let loadedAt = 0;
let inflight = null;
// the sign-in the in-flight request was made with
let inflightToken = null;
let expiryTimer = null;
const listeners = new Set();

export const serverNow = () => Date.now() + skew;

const isLive = (o, now = serverNow()) =>
  !o.expiresAt || new Date(o.expiresAt).getTime() > now;

function publish() {
  // drop timed offers whose countdown ended, then wake up again at the next end
  const now = serverNow();
  offers = offers.filter((o) => isLive(o, now));
  if (expiryTimer) clearTimeout(expiryTimer);
  const ends = offers
    .filter((o) => o.expiresAt)
    .map((o) => new Date(o.expiresAt).getTime() - now);
  if (ends.length)
    expiryTimer = setTimeout(publish, Math.max(Math.min(...ends), 0) + 250);
  for (const l of listeners) l(offers);
}

/** Re-reads the offers from the server (shared by every screen asking at once). */
export function refreshOffers() {
  const token = getAuthToken();
  // a request made before the customer's sign-in was restored can't see their timed offers
  if (inflight && inflightToken === token) return inflight;
  inflightToken = token;
  const request = apiRequest("/api/offers")
    .then((data) => {
      // an older request (another sign-in) finishing late must not overwrite this one
      if (request !== inflight) return offers;
      if (data?.serverTime)
        skew = new Date(data.serverTime).getTime() - Date.now();
      offers = data?.offers ?? [];
      loadedAt = Date.now();
      publish();
      return offers;
    })
    .catch(() => offers)
    .finally(() => {
      if (inflight === request) inflight = null;
    });
  inflight = request;
  return request;
}

/** Forgets everything (on sign-out), so one customer's countdowns never show to another. */
export function clearOffers() {
  offers = [];
  loadedAt = 0;
  publish();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => offers;

/** The live offers; re-reads them when the copy is older than maxAgeMs. */
export function useOffers(maxAgeMs = 15000) {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (Date.now() - loadedAt > maxAgeMs) refreshOffers();
  }, [maxAgeMs]);
  return list;
}

/** Re-renders every `ms` — for countdowns. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function discountedPrice(price, offer) {
  const value = Number(offer.discountValue);
  const next =
    offer.discountType === "percentage"
      ? price * (1 - value / 100)
      : price - value;
  return Math.max(0, Math.round(next * 100) / 100);
}

/** The best offer that takes money off this item at checkout right now, or null. */
export function checkoutOfferFor(menuItemId, list, price) {
  let best = null;
  for (const o of list ?? []) {
    if (
      !o.appliesAtCheckout ||
      !isLive(o) ||
      !(o.menuItemIds ?? []).includes(menuItemId)
    )
      continue;
    const p = discountedPrice(price, o);
    if (p < price && (!best || p < best.price)) best = { offer: o, price: p };
  }
  return best;
}

/** "29:41" (or "1:02:05" past an hour). */
export function formatCountdown(ms) {
  const total = Math.max(Math.ceil(ms / 1000), 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

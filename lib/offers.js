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

/** When this offer stops for this customer: their own timer (timed offers) or the end
 * date/time set in the admin panel — whichever comes first. null = no end. */
export function offerEndsAt(o) {
  const ends = [o?.expiresAt, o?.endsAt].filter(Boolean);
  if (!ends.length) return null;
  return ends.reduce((a, b) => (new Date(a) <= new Date(b) ? a : b));
}

const isLive = (o, now = serverNow()) => {
  const end = offerEndsAt(o);
  return !end || new Date(end).getTime() > now;
};

function publish() {
  // drop timed offers whose countdown ended, then wake up again at the next end
  const now = serverNow();
  offers = offers.filter((o) => isLive(o, now));
  if (expiryTimer) clearTimeout(expiryTimer);
  const ends = offers
    .map(offerEndsAt)
    .filter(Boolean)
    .map((end) => new Date(end).getTime() - now);
  // capped at a day: setTimeout misfires on delays past ~24.8 days
  if (ends.length)
    expiryTimer = setTimeout(
      publish,
      Math.min(Math.max(Math.min(...ends), 0) + 250, 24 * 60 * 60 * 1000),
    );
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

/** Time left split for a countdown display. */
export function countdownParts(ms) {
  const total = Math.max(Math.ceil(ms / 1000), 0);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
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

/** "-30%" or "-1.00 JD" (jd = the currency word). */
export function discountLabel(offer, jd) {
  return offer.discountType === "percentage"
    ? `-${Number(offer.discountValue)}%`
    : `-${Number(offer.discountValue).toFixed(2)} ${jd}`;
}

/**
 * Every available menu item that a live offer covers, once each, as { item, offer } —
 * offers that end soonest first, then the newest open-ended ones. `menuItems` is the
 * flat list from allMenuItems().
 */
export function itemsOnOffer(list, menuItems) {
  const byId = new Map((menuItems ?? []).map((item) => [item.id, item]));
  const ordered = [...(list ?? [])].filter((o) => isLive(o)).sort((a, b) => {
    const ea = offerEndsAt(a);
    const eb = offerEndsAt(b);
    return (
      Number(!!eb) - Number(!!ea) ||
      (ea && eb ? new Date(ea) - new Date(eb) : b.id - a.id)
    );
  });
  const seen = new Set();
  const out = [];
  for (const offer of ordered) {
    for (const id of offer.menuItemIds ?? []) {
      const item = byId.get(id);
      if (!item || seen.has(id) || item.isAvailable === false) continue;
      seen.add(id);
      out.push({ item, offer });
    }
  }
  return out;
}

/**
 * Up to `max` of itemsOnOffer()'s entries, taking turns between menu categories
 * (one shawarma, one burger, one drink, …) so a long pick from one category can't
 * crowd out the rest — and items that share a category photo don't all bunch up.
 */
export function spreadByCategory(entries, max) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.item.categoryId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  const queues = [...groups.values()];
  const out = [];
  while (out.length < max && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (q.length && out.length < max) out.push(q.shift());
    }
  }
  return out;
}

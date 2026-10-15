import { Asset } from "expo-asset";
import { Image } from "expo-image";

import { FLAME_FRAMES } from "@/components/AboutUs/AboutUs";

import { apiRequestCached, imageUrl } from "./api-client";
import { allMenuItems } from "./menu-sections";

// Bundled images the customer screens show first. In a release build they're already on
// the device, but in Expo Go / dev they're served by Metro over Wi-Fi — downloading them
// while the intro plays means the home, menu and about screens open with them in place.
const LOCAL_IMAGES = [
  require("@/assets/img/remove_beam_logoo.jpg"),
  require("@/assets/img/beam_logoo.jpg"),
  require("@/assets/img/menu-1.jpg"),
  require("@/assets/img/menu-5.jpg"),
  require("@/assets/img/drinks_kinza.jpg"),
  require("@/assets/img/chef_beam_about-remove.jpg"),
  require("@/assets/img/about/beam-res-about.jpg"),
  require("@/assets/img/about/chef-1.jpg"),
  require("@/assets/img/about/chef-2.jpg"),
  require("@/assets/img/about/chef-3.jpg"),
  require("@/assets/img/about/chef-4.jpg"),
  require("@/assets/img/about/menu-img/جبنة بالعسل.jpg"),
  require("@/assets/img/about/menu-img/الشريمب.jpg"),
  require("@/assets/img/about/menu-img/بيم برغر.jpg"),
  require("@/assets/img/about/menu-img/شاورما البيم سأ و لدع.jpg"),
  require("@/assets/img/about/menu-img/فتة شاورما مع رز.jpg"),
  require("@/assets/img/about/menu-img/كينوا.jpg"),
];

let started = false;

// Loyalty progress + vouchers are per account — cache them under the user id.
export const loyaltyProgressKey = (userId: number) => `/api/loyalty/progress#${userId}`;
export const loyaltyVouchersKey = (userId: number) => `/api/loyalty/vouchers#${userId}`;

/** Every image a gift tile shows: the grey base plus each revealed colour piece. */
export function loyaltyTileUrls(item: any): string[] {
  const version = item.updatedAt ? `?v=${item.updatedAt}` : "";
  const urls = item.grayImage ? [imageUrl(item.grayImage)] : [];
  for (let i = 0; i < (item.revealedCount ?? 0); i++) {
    urls.push(imageUrl(`/images/${item.id}/layer_${i}.png${version}`));
  }
  return urls;
}

let loyaltyWarmedFor: number | null = null;

/**
 * Warms the Gifts page for a signed-in user: their progress + vouchers responses
 * and every tile image (grey base + revealed pieces), so the page opens with the
 * collection already drawn instead of an empty screen filling in.
 */
export function preloadLoyalty(userId: number) {
  if (loyaltyWarmedFor === userId) return;
  loyaltyWarmedFor = userId;

  const prefetched = new Set<string>();
  apiRequestCached(
    "/api/loyalty/progress",
    (data: any) => {
      const urls = (data?.progress ?? [])
        .flatMap(loyaltyTileUrls)
        .filter((u: string) => u && !prefetched.has(u));
      urls.forEach((u: string) => prefetched.add(u));
      if (urls.length) Image.prefetch(urls, "memory-disk").catch(() => {});
    },
    () => {},
    { cacheKey: loyaltyProgressKey(userId) },
  );
  apiRequestCached("/api/loyalty/vouchers", () => {}, () => {}, {
    cacheKey: loyaltyVouchersKey(userId),
  });
}

/**
 * Warms every cache the customer screens read from, once per app launch:
 * the /api/menu response (memory + storage), every menu photo (expo-image
 * disk + memory cache) and the bundled images. Called while the intro video
 * plays, so by the time it ends the menu pages render without waiting.
 */
export function preloadCustomerContent() {
  if (started) return;
  started = true;

  Asset.loadAsync([...LOCAL_IMAGES, ...FLAME_FRAMES]).catch(() => {});

  const prefetched = new Set<string>();
  apiRequestCached(
    "/api/menu",
    (data: any) => {
      const categories = data?.categories ?? [];
      const items = allMenuItems(categories);
      // Order = what the user sees first: home deals carousel, menu category
      // cards, then every item photo for the category pages.
      const paths = [
        ...items.filter((i: any) => i.hasLoyalty).map((i: any) => i.imageUrl),
        ...categories.map((c: any) => c.imageUrl),
        ...items.map((i: any) => i.imageUrl),
      ];
      const urls: string[] = [];
      for (const path of paths) {
        const url = path && imageUrl(path);
        if (url && !prefetched.has(url)) {
          prefetched.add(url);
          urls.push(url);
        }
      }
      if (urls.length) Image.prefetch(urls, "memory-disk").catch(() => {});
    },
    () => {},
  );
}

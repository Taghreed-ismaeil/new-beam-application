import { Dimensions } from "react-native";

/**
 * Admin panel text size. Staff use it on phones AND on an iPad, where the
 * phone-sized fonts looked tiny — so every admin fontSize / lineHeight goes
 * through fs(), which scales by the device's short side (works in either
 * orientation). Tweak the two numbers below to make everything bigger/smaller.
 */
const PHONE_SCALE = 1.12;
const TABLET_SCALE = 1.4;

const { width, height } = Dimensions.get("window");
const isTablet = Math.min(width, height) >= 600;

export const ADMIN_FONT_SCALE = isTablet ? TABLET_SCALE : PHONE_SCALE;

/** Scaled font size, rounded to half a point. */
export function fs(size: number) {
  return Math.round(size * ADMIN_FONT_SCALE * 2) / 2;
}

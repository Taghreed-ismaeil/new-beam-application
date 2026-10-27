import {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";

/* =========================================================
   MOTION PRESETS
   Shared entrance animations so every page moves the same way.
   Use on an Animated.View's `entering` prop:
     <Animated.View entering={enterUp(index)}>…</Animated.View>
   `index` staggers items in a list; the delay is capped so long
   lists don't keep the last items waiting.
========================================================= */

// Kept short so a page reads as "already there" when you navigate to it — long
// staggers made switching pages feel slow even when the data was cached.
const STEP = 35;
const MAX_DELAY = 220;

const delayFor = (index = 0) => Math.min(index * STEP, MAX_DELAY);

const spring = (builder) => builder.springify().damping(20).stiffness(260).mass(0.7);

/** Rise up into place — the default for cards and sections. */
export const enterUp = (index = 0) => spring(FadeInDown.delay(delayFor(index)));

/** Drop down into place — for headers and things at the top of a page. */
export const enterDown = (index = 0) => spring(FadeInUp.delay(delayFor(index)));

/** Slide in from the left / right edge — used for the zig-zag menu cards. */
export const enterFromLeft = (index = 0) => spring(FadeInLeft.delay(delayFor(index)));
export const enterFromRight = (index = 0) => spring(FadeInRight.delay(delayFor(index)));

/** Pop in from smaller — for tiles and badges. */
export const enterPop = (index = 0) => spring(ZoomIn.delay(delayFor(index)));

/** Plain fade — for big media (hero images, videos). */
export const enterFade = (index = 0) => FadeIn.duration(500).delay(delayFor(index));

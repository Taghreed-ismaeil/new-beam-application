/* =========================================================
   TAB TRANSITIONS
   Bottom-tab navigation slides in the direction of travel: a tab to the
   right of the current one slides in from the right, a tab to the left
   slides in from the left (tabs keep the same order in Arabic, so this
   never mirrors).

   The root Stack reads each route's animation from here through
   `screenAnimationFor`. Both screens involved are updated before navigating:
   the incoming screen uses its own animation, and a screen being popped
   plays its animation in reverse, so it's given the opposite side.
========================================================= */

const animations = {};

const FROM_RIGHT = "slide_from_right";
const FROM_LEFT = "slide_from_left";

/**
 * @param {string} target   root route name of the tab being opened
 * @param {string[]} current possible root route names of the screen on top now
 * @param {number} direction +1 = moving right, -1 = moving left, 0 = same tab
 */
export function prepareTabTransition(target, current, direction) {
  if (!direction) return;

  animations[target] = direction > 0 ? FROM_RIGHT : FROM_LEFT;

  for (const name of current) {
    if (name !== target) animations[name] = direction > 0 ? FROM_LEFT : FROM_RIGHT;
  }

  // The leaving screen only needs its override for this one transition — clear it afterwards
  // so the next time that page is opened some other way it slides in normally again.
  setTimeout(() => {
    for (const name of current) {
      if (name !== target) delete animations[name];
    }
  }, 800);
}

export function screenAnimationFor(routeName) {
  return animations[routeName] ?? FROM_RIGHT;
}

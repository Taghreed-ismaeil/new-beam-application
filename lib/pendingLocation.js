// One-shot handoff for the picked lat/lng/address from the delivery-location
// screen back to checkout — simpler than wiring a whole context for a single
// value that only ever needs to survive one screen transition.
let pending = null;

export function setPendingDeliveryLocation(value) {
  pending = value;
}

export function takePendingDeliveryLocation() {
  const value = pending;
  pending = null;
  return value;
}

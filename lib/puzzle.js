// Gift images are drawn as a 12-piece jigsaw (3 columns x 4 rows). Each scan
// colours in the next pieces; the order is shuffled per item but fixed, so a
// customer's puzzle always fills in the same way on every screen.
// Must match PUZZLE_PIECES in backend/src/lib/images.ts.
export const PUZZLE_COLS = 3;
export const PUZZLE_ROWS = 4;
export const PUZZLE_PIECES = PUZZLE_COLS * PUZZLE_ROWS;

// Knob outline along one edge: p runs 0→1 along the edge, q pushes outward.
// Both are in units of the shorter piece side so knobs look the same on every edge.
const KNOB = [
  ["L", [-0.15, 0]],
  ["C", [-0.08, 0.02], [-0.2, 0.24], [0, 0.24]],
  ["C", [0.2, 0.24], [0.08, 0.02], [0.15, 0]],
];

// Knob direction for each inner edge, alternating like a classic jigsaw.
// +1 = knob points down (horizontal edges) or right (vertical edges).
const tabSign = (r, c) => ((r + c) % 2 === 0 ? 1 : -1);

function edge(ax, ay, bx, by, sign, unit) {
  const len = Math.hypot(bx - ax, by - ay);
  if (!sign) return `L ${bx} ${by}`;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const nx = -uy * sign;
  const ny = ux * sign;
  const mx = ax + (ux * len) / 2;
  const my = ay + (uy * len) / 2;
  const pt = ([p, q]) => {
    const x = mx + ux * p * unit + nx * q * unit;
    const y = my + uy * p * unit + ny * q * unit;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  const parts = KNOB.map(([cmd, ...pts]) => `${cmd} ${pts.map(pt).join(" ")}`);
  return `${parts.join(" ")} L ${bx} ${by}`;
}

/** SVG path for every piece, indexed row by row, on a size x size canvas. */
export function puzzlePaths(size) {
  const pw = size / PUZZLE_COLS;
  const ph = size / PUZZLE_ROWS;
  const unit = Math.min(pw, ph);
  const paths = [];
  for (let r = 0; r < PUZZLE_ROWS; r++) {
    for (let c = 0; c < PUZZLE_COLS; c++) {
      const x0 = c * pw;
      const x1 = x0 + pw;
      const y0 = r * ph;
      const y1 = y0 + ph;
      const top = r === 0 ? 0 : tabSign(r, c);
      const bottom = r === PUZZLE_ROWS - 1 ? 0 : -tabSign(r + 1, c);
      const right = c === PUZZLE_COLS - 1 ? 0 : -tabSign(r + 7, c + 1);
      const left = c === 0 ? 0 : tabSign(r + 7, c);
      paths.push(
        [
          `M ${x0} ${y0}`,
          edge(x0, y0, x1, y0, top, unit),
          edge(x1, y0, x1, y1, right, unit),
          edge(x1, y1, x0, y1, bottom, unit),
          edge(x0, y1, x0, y0, left, unit),
          "Z",
        ].join(" "),
      );
    }
  }
  return paths;
}

/** The order an item's pieces get coloured in — a shuffle seeded by the item id. */
export function revealOrder(itemId) {
  let seed = (Number(itemId) || 1) * 2654435761;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: PUZZLE_PIECES }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

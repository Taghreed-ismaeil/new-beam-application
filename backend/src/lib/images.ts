import sharp from 'sharp';
import { uploadBuffer } from './r2';

const SIZE = 480;

// Appends the row's updatedAt as a cache-busting query param — without this, a photo
// re-upload keeps the same URL and browsers/CDNs/native Image caches keep serving the old bytes.
export function versionedUrl(path: string | null | undefined, updatedAt: Date | null | undefined): string | null {
  if (!path) return path ?? null;
  if (!updatedAt) return path;
  return `${path}?v=${updatedAt.getTime()}`;
}

export type LoyaltyLayer = {
  label: string;
  x0?: number;
  y0: number;
  x1?: number;
  y1: number;
  // When set, this piece is cut as a pie wedge (e.g. one pizza slice) instead of a rectangle —
  // x0/y0/x1/y1 above should span the full image (0,0,1,1) so it positions as a full overlay.
  wedge?: { cx: number; cy: number; r: number; startDeg: number; endDeg: number };
};

function placeholderSvg(name: string, emoji: string, bg: string, bg2: string) {
  return `
  <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${SIZE / 2}" cy="${SIZE * 0.4}" r="${SIZE * 0.28}" fill="rgba(255,255,255,0.18)"/>
    <text x="50%" y="42%" font-size="150" text-anchor="middle" dominant-baseline="middle"
          fill="rgba(255,255,255,0.92)">${emoji}</text>
    <text x="50%" y="82%" font-size="46" font-family="Tahoma, Arial, sans-serif" font-weight="bold"
          text-anchor="middle" fill="white">${name}</text>
  </svg>`;
}

export function evenLayers(count: number, labelPrefix: string): LoyaltyLayer[] {
  const layers: LoyaltyLayer[] = [];
  for (let i = 0; i < count; i++) {
    layers.push({ label: `${labelPrefix} ${i + 1}`, y0: i / count, y1: (i + 1) / count });
  }
  return layers;
}

// Splits one food-focused bounding box (e.g. "just the fries") into a rows x cols grid of smaller
// pieces — more scans to complete, while every piece still lands on food, never on background.
export function subdivide(
  box: { x0: number; y0: number; x1: number; y1: number },
  rows: number,
  cols: number,
  label: string,
): LoyaltyLayer[] {
  const layers: LoyaltyLayer[] = [];
  const w = (box.x1 - box.x0) / cols;
  const h = (box.y1 - box.y0) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      layers.push({
        label,
        x0: box.x0 + c * w,
        x1: box.x0 + (c + 1) * w,
        y0: box.y0 + r * h,
        y1: box.y0 + (r + 1) * h,
      });
    }
  }
  return layers;
}

// Evenly divides a circle into `count` pie-slice layers (e.g. one per pizza slice), starting
// from the top (12 o'clock) and going clockwise. cx/cy/r are fractions of the square canvas.
export function pizzaSliceLayers(
  count: number,
  labelPrefix: string,
  cx = 0.5,
  cy = 0.48,
  r = 0.4,
): LoyaltyLayer[] {
  const layers: LoyaltyLayer[] = [];
  for (let i = 0; i < count; i++) {
    layers.push({
      label: `${labelPrefix} ${i + 1}`,
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
      wedge: { cx, cy, r, startDeg: (360 / count) * i, endDeg: (360 / count) * (i + 1) },
    });
  }
  return layers;
}

function wedgeMaskSvg(size: number, wedge: { cx: number; cy: number; r: number; startDeg: number; endDeg: number }) {
  const cx = wedge.cx * size;
  const cy = wedge.cy * size;
  const r = wedge.r * size;
  const startAngle = ((wedge.startDeg) * Math.PI) / 180 - Math.PI / 2;
  const endAngle = ((wedge.endDeg) * Math.PI) / 180 - Math.PI / 2;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = wedge.endDeg - wedge.startDeg > 180 ? 1 : 0;
  const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="black"/>
    <path d="${path}" fill="white"/>
  </svg>`;
}

export async function generateLoyaltyImages(
  menuItemId: number,
  layers: LoyaltyLayer[],
  opts: { sourceBuffer?: Buffer | null; name: string; emoji?: string; bg?: string; bg2?: string },
) {
  const prefix = `images/${menuItemId}`;

  let colorBuffer: Buffer;
  if (opts.sourceBuffer) {
    colorBuffer = await sharp(opts.sourceBuffer).resize(SIZE, SIZE, { fit: 'cover' }).png().toBuffer();
  } else {
    const svg = Buffer.from(placeholderSvg(opts.name, opts.emoji ?? '🍽️', opts.bg ?? '#8e44ad', opts.bg2 ?? '#2c3e50'));
    colorBuffer = await sharp(svg).png().toBuffer();
  }
  const grayBuffer = await sharp(colorBuffer).grayscale().png().toBuffer();

  await uploadBuffer(`${prefix}/color.png`, colorBuffer, 'image/png');
  await uploadBuffer(`${prefix}/gray.png`, grayBuffer, 'image/png');

  const meta = await sharp(colorBuffer).metadata();
  const width = meta.width!;
  const height = meta.height!;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    let layerBuffer: Buffer;

    if (layer.wedge) {
      // Full-canvas cutout: everything outside the wedge becomes transparent, so it overlays
      // directly on top of the gray base at (0,0,1,1) without needing a rectangular crop.
      const mask = Buffer.from(wedgeMaskSvg(width, layer.wedge));
      layerBuffer = await sharp(colorBuffer)
        .ensureAlpha()
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer();
    } else {
      const { x0 = 0, y0, x1 = 1, y1 } = layer;
      const left = Math.round(x0 * width);
      const top = Math.round(y0 * height);
      const w = Math.max(1, Math.min(Math.round((x1 - x0) * width), width - left));
      const h = Math.max(1, Math.min(Math.round((y1 - y0) * height), height - top));
      layerBuffer = await sharp(colorBuffer).extract({ left, top, width: w, height: h }).toBuffer();
    }

    await uploadBuffer(`${prefix}/layer_${i}.png`, layerBuffer, 'image/png');
  }

  return {
    colorImage: `/images/${menuItemId}/color.png`,
    grayImage: `/images/${menuItemId}/gray.png`,
  };
}

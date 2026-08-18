import sharp from 'sharp';
import { uploadBuffer } from './r2';

const SIZE = 600;

// A tasteful stand-in for real food photography — used until the restaurant supplies an actual
// photo for this item. Warm gradient card with a large centered icon, no baked-in text (the name
// is already shown by the UI, so the image itself stays reusable and clean).
function cardSvg(emoji: string, bg: string, bg2: string) {
  return `
  <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="42%" r="45%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="50%" cy="42%" r="42%" fill="url(#glow)"/>
    <text x="50%" y="50%" font-size="220" text-anchor="middle" dominant-baseline="central"
          fill="rgba(255,255,255,0.92)">${emoji}</text>
  </svg>`;
}

export async function generateMenuCardImage(itemId: number, emoji: string, bg: string, bg2: string): Promise<string> {
  const buffer = await sharp(Buffer.from(cardSvg(emoji, bg, bg2))).png().toBuffer();
  await uploadBuffer(`menu-cards/${itemId}.png`, buffer, 'image/png');
  return `/menu-cards/${itemId}.png`;
}

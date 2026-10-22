import 'dotenv/config';
// Replaces the Gifts page items with the restaurant's chosen 34 menu items.
//
//   - every chosen item gets a gift picture (placeholder card for now — swap in a
//     real photo later with POST /api/admin/menu/items/:id/loyalty), split into
//     4 / 6 / 8 pieces by price (the Economy Meal gets 12), prize = the item free
//   - items that were gifts before but aren't chosen now stop being gifts
//     (qrToken / qrGroupToken cleared — their earned vouchers stay valid)
//   - the general gift QR (BEEM_GIFT_QR) then picks among the new items
//
// Usage (from the backend folder; reads backend/.env):
//   npx tsx scripts/enroll-gifts.ts            → dry run: prints the plan, writes nothing
//   npx tsx scripts/enroll-gifts.ts --apply    → writes to DATABASE_URL and uploads to R2
//   OUT_DIR=./gift-preview npx tsx scripts/enroll-gifts.ts --apply
//                                      → images go to that folder instead of R2 (testing)
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const OUT_DIR = process.env.OUT_DIR;
const SIZE = 480;

// [menu item id, pieces] — pieces by price: ≤2 JD → 4, ≤4 JD → 6, above → 8
const GIFTS: [number, number][] = [
  [50, 4], [140, 4], [141, 4], [144, 4], [145, 4], [147, 6], [155, 4],
  [185, 6], [186, 6], [187, 6], [188, 6], [189, 6],
  [199, 6], [200, 6], [203, 6],
  [156, 8], [160, 4], [163, 4],
  [165, 6], [168, 6], [169, 6], [172, 8], [173, 12], [175, 6],
  [211, 8], [212, 6], [213, 6], [218, 6],
  [234, 6], [235, 6], [239, 4], [240, 4], [241, 4], [247, 4],
];

const EMOJI: [RegExp, string][] = [
  [/موهيتو|تروبيك|فيلفت|ليمون/, '🥤'],
  [/برغر|تشكن/, '🍔'],
  [/شريمب/, '🍤'],
  [/بطاطا|كيوبس|مكسيكي|مفركة/, '🍟'],
  [/سلطة|ناتشوز/, '🥗'],
  [/ماك اند تشيز|جبنة|أجبان/, '🧀'],
  [/نقانق/, '🌭'],
  [/خبز/, '🥖'],
  [/حمص|كبدة/, '🍽️'],
  [/زنجر|تندر|تيركي|فاهيتا/, '🌯'],
  [/شاورما|وجبة/, '🥙'],
];
const emojiFor = (name: string) => EMOJI.find(([re]) => re.test(name))?.[1] ?? '🍽️';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Brand-coloured stand-in until the real photo arrives: teal card, soft orange
// glow, the dish emoji and its Arabic name.
function placeholder(name: string) {
  const short = name.replace(/\s*\([^)]*\)/g, '').trim();
  const size = short.length > 20 ? 30 : short.length > 14 ? 36 : short.length > 10 ? 42 : 50;
  return Buffer.from(`
  <svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00827A"/>
        <stop offset="100%" stop-color="#004B45"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="45%">
        <stop offset="0%" stop-color="#FC4A14" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#FC4A14" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${SIZE / 2}" cy="${SIZE * 0.4}" r="${SIZE * 0.36}" fill="url(#glow)"/>
    <circle cx="${SIZE / 2}" cy="${SIZE * 0.4}" r="${SIZE * 0.24}" fill="rgba(255,255,255,0.14)"/>
    <text x="50%" y="42%" font-size="140" text-anchor="middle" dominant-baseline="middle" fill="#FFFFFF">${emojiFor(name)}</text>
    <text x="50%" y="83%" font-size="${size}" font-family="Tahoma, Segoe UI, Arial, sans-serif" font-weight="bold"
          text-anchor="middle" direction="rtl" fill="#FFFFFF">${esc(short)}</text>
  </svg>`);
}

// same pieces as lib/images.ts evenLayers(): horizontal strips top → bottom
function evenLayers(count: number) {
  return Array.from({ length: count }, (_, i) => ({ label: `قطعة ${i + 1}`, y0: i / count, y1: (i + 1) / count }));
}

let upload: (key: string, body: Buffer) => Promise<void>;
if (OUT_DIR) {
  upload = async (key, body) => {
    const f = path.join(OUT_DIR, key);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  };
} else {
  // only touch the real bucket when actually applying
  upload = async (key, body) => {
    const { uploadBuffer } = await import('../src/lib/r2');
    await uploadBuffer(key, body, 'image/png');
  };
}

// same files and paths as lib/images.ts generateLoyaltyImages()
async function makeImages(id: number, name: string, layers: ReturnType<typeof evenLayers>) {
  const color = await sharp(placeholder(name)).png().toBuffer();
  const gray = await sharp(color).grayscale().png().toBuffer();
  await upload(`images/${id}/color.png`, color);
  await upload(`images/${id}/gray.png`, gray);
  for (let i = 0; i < layers.length; i++) {
    const top = Math.round(layers[i].y0 * SIZE);
    const height = Math.min(Math.round((layers[i].y1 - layers[i].y0) * SIZE), SIZE - top);
    const piece = await sharp(color).extract({ left: 0, top, width: SIZE, height }).png().toBuffer();
    await upload(`images/${id}/layer_${i}.png`, piece);
  }
  return { colorImage: `/images/${id}/color.png`, grayImage: `/images/${id}/gray.png` };
}

const token = () => `MENU_${Math.random().toString(16).slice(2, 10)}`;

(async () => {
  const ids = GIFTS.map(([id]) => id);
  const items = await prisma.menuItem.findMany({ where: { id: { in: ids } } });
  const missing = ids.filter((id) => !items.some((i) => i.id === id));
  if (missing.length) throw new Error(`menu items not found: ${missing.join(', ')}`);

  const current = await prisma.menuItem.findMany({
    where: { OR: [{ qrToken: { not: null } }, { qrGroupToken: { not: null } }] },
    select: { id: true, name: true, qrToken: true, qrGroupToken: true, layers: true, colorImage: true, grayImage: true, rewardType: true, rewardValue: true },
  });
  const retire = current.filter((c) => !ids.includes(c.id));

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${GIFTS.length} gifts, ${retire.length} old gifts to retire`);
  console.log('retire:', retire.map((r) => `${r.id} ${r.name}`).join(' | ') || '—');

  if (!APPLY) {
    for (const [id, pieces] of GIFTS) {
      const it = items.find((i) => i.id === id)!;
      console.log(`  ${id}  ${it.name}  ${Number(it.price).toFixed(2)} JD  → ${pieces} pieces`);
    }
    return;
  }

  // keep what we change, so it can be put back
  const backup = path.join(OUT_DIR ?? '.', `gifts-backup-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.writeFileSync(backup, JSON.stringify(current, null, 2));
  console.log('backup of the old gift rows →', backup);

  for (const [id, pieces] of GIFTS) {
    const it = items.find((i) => i.id === id)!;
    const layers = evenLayers(pieces);
    const images = await makeImages(id, it.name, layers);
    await prisma.menuItem.update({
      where: { id },
      data: {
        qrToken: it.qrToken ?? token(),
        qrGroupToken: null,
        layers,
        ...images,
        rewardType: 'free',
        rewardValue: `${it.name.replace(/\s*\([^)]*\)/g, '').trim()} مجاناً`,
      },
    });
    console.log(`  ✓ ${id} ${it.name} (${pieces})`);
  }

  if (retire.length) {
    await prisma.menuItem.updateMany({
      where: { id: { in: retire.map((r) => r.id) } },
      data: { qrToken: null, qrGroupToken: null },
    });
    console.log('  ✓ retired', retire.length);
  }

  const now = await prisma.menuItem.count({ where: { OR: [{ qrToken: { not: null } }, { qrGroupToken: { not: null } }] } });
  console.log(`done — ${now} items on the Gifts page`);
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import 'dotenv/config';
// Puts real photos on the Gifts-page items (replacing the placeholder cards from
// enroll-gifts.ts). For each item: color + gray picture and its pieces are rebuilt
// from the photo — same piece layout already saved on the item, so customers'
// collected pieces stay where they are — and the photo becomes the item's menu photo.
//
// Usage (from the backend folder; reads backend/.env):
//   npx tsx scripts/gift-photos.ts <photosDir>             → dry run
//   npx tsx scripts/gift-photos.ts <photosDir> --apply     → DATABASE_URL + R2
//   OUT_DIR=./gift-preview npx tsx scripts/gift-photos.ts <photosDir> --apply   (testing)
// <photosDir> holds 01 … 30 as .png or .jpg (the collage cut left→right, top→bottom).
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const [photosDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const APPLY = process.argv.includes('--apply');
const OUT_DIR = process.env.OUT_DIR;
const SIZE = 480;

// collage tile → menu item id (checked picture by picture)
const PHOTOS: Record<string, number> = {
  '01': 50, // كبدة مع دبس رمان
  '02': 140, // مفركة بطاطا
  '03': 141, // جبنة بالعسل
  '04': 144, // نقانق مع بيض
  '05': 145, // مكس أجبان
  '06': 147, // صحن حمص بالشاورما (دجاج)
  '07': 155, // خبز عربي
  '08': 156, // شاورما بالكريما
  '09': 160, // سندويشة شاورما دجاج كبير
  '10': 163, // سندويشة شاورما لحمة كبير
  '11': 165, // وجبة عادي دجاج
  '12': 168, // وجبة برايز دجاج (5 قطع)
  '13': 169, // وجبة عادي لحمة
  '14': 172, // وجبة برايز لحمة (5 قطع)
  '15': 173, // الوجبة الاقتصادية
  '16': 175, // صحن شاورما دجاج (250 غم)
  '17': 185, // الشريمب
  '18': 187, // تندر
  '19': 211, // ماك اند تشيز
  '20': 188, // تيركي مع دجاج
  '21': 189, // فاهيتا
  '22': 199, // كريسبي تشكن
  '23': 200, // بيم برغر (180 غم)
  '24': 213, // مكسيكي
  '25': 212, // بطاطا كيوبس
  '26': 218, // سلطة ناتشوز
  '27': 235, // بيري فيلفت
  '28': 240, // موهيتو بلو كراساو
  '29': 241, // موهيتو فراولة
  '30': 247, // ليمون ونعنع
};

const photoFile = (tile: string) =>
  [".png", ".jpg"].map((ext) => path.join(photosDir, tile + ext)).find((f) => fs.existsSync(f));

type Layer = { y0: number; y1: number; x0?: number; x1?: number };

let upload: (key: string, body: Buffer) => Promise<void>;
if (OUT_DIR) {
  upload = async (key, body) => {
    const f = path.join(OUT_DIR, key);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, body);
  };
} else {
  upload = async (key, body) => {
    const { uploadBuffer } = await import('../src/lib/r2');
    await uploadBuffer(key, body, 'image/png');
  };
}

(async () => {
  if (!photosDir) throw new Error('usage: gift-photos.ts <photosDir> [--apply]');
  const ids = Object.values(PHOTOS);
  const items = await prisma.menuItem.findMany({ where: { id: { in: ids } } });

  for (const [tile, id] of Object.entries(PHOTOS)) {
    const it = items.find((i) => i.id === id);
    const file = photoFile(tile);
    if (!it) throw new Error(`item ${id} not found`);
    if (!it.qrToken) throw new Error(`item ${id} (${it.name}) is not on the Gifts page`);
    if (!file) throw new Error(`missing photo ${tile}.png / ${tile}.jpg in ${photosDir}`);
  }

  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — ${ids.length} photos`);
  for (const [tile, id] of Object.entries(PHOTOS)) {
    const it = items.find((i) => i.id === id)!;
    if (!APPLY) {
      console.log(`  ${path.basename(photoFile(tile)!)} → ${id} ${it.name}`);
      continue;
    }
    const color = await sharp(photoFile(tile)!).resize(SIZE, SIZE, { fit: 'cover' }).png().toBuffer();
    const gray = await sharp(color).grayscale().png().toBuffer();
    await upload(`images/${id}/color.png`, color);
    await upload(`images/${id}/gray.png`, gray);

    const layers = (it.layers as Layer[]) ?? [];
    for (let i = 0; i < layers.length; i++) {
      const { x0 = 0, y0, x1 = 1, y1 } = layers[i];
      const left = Math.round(x0 * SIZE);
      const top = Math.round(y0 * SIZE);
      const width = Math.max(1, Math.min(Math.round((x1 - x0) * SIZE), SIZE - left));
      const height = Math.max(1, Math.min(Math.round((y1 - y0) * SIZE), SIZE - top));
      await upload(`images/${id}/layer_${i}.png`, await sharp(color).extract({ left, top, width, height }).png().toBuffer());
    }

    // touching the row bumps updatedAt, which the app appends to image URLs so the
    // old placeholder isn't served from cache
    await prisma.menuItem.update({
      where: { id },
      data: { colorImage: `/images/${id}/color.png`, grayImage: `/images/${id}/gray.png`, imageUrl: `/images/${id}/color.png` },
    });
    console.log(`  ✓ ${path.basename(photoFile(tile)!)} → ${id} ${it.name} (${layers.length} pieces)`);
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

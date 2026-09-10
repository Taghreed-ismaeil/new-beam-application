import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { generateLoyaltyImages, evenLayers } from '../src/lib/images';
import { makeToken, generateQrImage } from '../src/lib/qr';

// Same one-off "gifts" promo enrollment as seed-gifts-salads.ts, for the فتات batch.

const SOURCE_DIR = 'C:/Users/user/Desktop/Beam Menu/Beam Menu/فتات';
const PIECES = 27;
const CATEGORY_ID = 3; // مقبلات — hidden anyway since isAvailable is false

type ItemSeed = {
  id: number;
  file: string;
  name: string;
  nameEn: string;
};

const ITEMS: ItemSeed[] = [
  { id: 107, file: 'بطاطا كيوبس.png', name: 'بطاطا كيوبس', nameEn: 'Potato Cubes' },
  { id: 108, file: 'فتة شاورما مع رز.png', name: 'فتة شاورما مع رز', nameEn: 'Shawarma Fatteh with Rice' },
  { id: 109, file: 'فتة شاورما.jpeg', name: 'فتة شاورما', nameEn: 'Shawarma Fatteh' },
  { id: 110, file: 'فتة فلافل.png', name: 'فتة فلافل', nameEn: 'Falafel Fatteh' },
  { id: 111, file: 'ماك اند شيز.png', name: 'ماك اند شيز', nameEn: 'Mac and Cheese' },
  { id: 112, file: 'ماكسيكان.png', name: 'ماكسيكان', nameEn: 'Mexican Fries' },
];

async function main() {
  const tokens: Record<string, string> = {};

  for (const item of ITEMS) {
    const filePath = path.join(SOURCE_DIR, item.file);
    const sourceBuffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
    if (!sourceBuffer) {
      console.warn(`Missing file, skipping: ${filePath}`);
      continue;
    }

    await prisma.menuItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        categoryId: CATEGORY_ID,
        name: item.name,
        nameEn: item.nameEn,
        price: 0,
        isAvailable: false,
        requiresPurchase: false,
      },
      update: {
        name: item.name,
        nameEn: item.nameEn,
        isAvailable: false,
        requiresPurchase: false,
      },
    });

    const existing = await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    const qrToken = existing.qrToken ?? makeToken('MENU');
    if (!existing.qrToken) await generateQrImage(qrToken);

    const layers = evenLayers(PIECES, 'قطعة');
    const images = await generateLoyaltyImages(item.id, layers, { sourceBuffer, name: item.name });

    await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        qrToken,
        layers: layers as any,
        colorImage: images.colorImage,
        grayImage: images.grayImage,
        imageUrl: images.colorImage,
        rewardType: 'free',
        rewardValue: `${item.nameEn} مجاناً`,
      },
    });

    tokens[item.nameEn] = qrToken;
    console.log(`Enrolled ${item.name} (${item.nameEn}) -> id ${item.id}, qrToken ${qrToken}`);
  }

  console.log('\nReal qrTokens (paste into RARITY_TOKEN_MAP):');
  console.log(JSON.stringify(tokens, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

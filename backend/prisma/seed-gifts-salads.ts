import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';
import { generateLoyaltyImages, evenLayers } from '../src/lib/images';
import { makeToken, generateQrImage } from '../src/lib/qr';

// One-off enrollment for the "gifts" promo salads — not on the real orderable menu yet
// (isAvailable: false, price: 0), so requiresPurchase: false lets anyone scan and collect
// pieces without needing a real order behind it. Flip isAvailable + set a real price once
// they're added to the menu for real; requiresPurchase can then go back to true (the default)
// if the purchase-gated flow should apply to them too.

const SOURCE_DIR = 'C:/Users/user/Desktop/Beam Menu/Beam Menu/سلطات';
const PIECES = 27;
const CATEGORY_ID = 3; // مقبلات — hidden anyway since isAvailable is false

type SaladSeed = {
  id: number;
  file: string;
  name: string;
  nameEn: string;
};

const SALADS: SaladSeed[] = [
  { id: 101, file: 'جريك سلط.png', name: 'سلطة جريك', nameEn: 'Greek Salad' },
  { id: 102, file: 'روكا.png', name: 'سلطة روكا', nameEn: 'Arugula Salad' },
  { id: 103, file: 'سيزر سلط.png', name: 'سلطة سيزر', nameEn: 'Caesar Salad' },
  { id: 104, file: 'شاورما سلط.png', name: 'سلطة شاورما', nameEn: 'Shawarma Salad' },
  { id: 105, file: 'فتوش.png', name: 'فتوش', nameEn: 'Fattoush' },
  { id: 106, file: 'كينوا.png', name: 'سلطة كينوا', nameEn: 'Quinoa Salad' },
];

async function main() {
  const tokens: Record<string, string> = {};

  for (const salad of SALADS) {
    const filePath = path.join(SOURCE_DIR, salad.file);
    const sourceBuffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
    if (!sourceBuffer) {
      console.warn(`Missing file, skipping: ${filePath}`);
      continue;
    }

    await prisma.menuItem.upsert({
      where: { id: salad.id },
      create: {
        id: salad.id,
        categoryId: CATEGORY_ID,
        name: salad.name,
        nameEn: salad.nameEn,
        price: 0,
        isAvailable: false,
        requiresPurchase: false,
      },
      update: {
        name: salad.name,
        nameEn: salad.nameEn,
        isAvailable: false,
        requiresPurchase: false,
      },
    });

    const existing = await prisma.menuItem.findUniqueOrThrow({ where: { id: salad.id } });
    const qrToken = existing.qrToken ?? makeToken('MENU');
    if (!existing.qrToken) await generateQrImage(qrToken);

    const layers = evenLayers(PIECES, 'قطعة');
    const images = await generateLoyaltyImages(salad.id, layers, { sourceBuffer, name: salad.name });

    await prisma.menuItem.update({
      where: { id: salad.id },
      data: {
        qrToken,
        layers: layers as any,
        colorImage: images.colorImage,
        grayImage: images.grayImage,
        imageUrl: images.colorImage,
        rewardType: 'free',
        rewardValue: `${salad.nameEn} مجاناً`,
      },
    });

    tokens[salad.nameEn] = qrToken;
    console.log(`Enrolled ${salad.name} (${salad.nameEn}) -> id ${salad.id}, qrToken ${qrToken}`);
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

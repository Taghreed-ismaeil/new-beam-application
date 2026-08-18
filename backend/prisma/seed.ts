import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import { generateLoyaltyImages, evenLayers, subdivide, LoyaltyLayer } from '../src/lib/images';
import { generateMenuCardImage } from '../src/lib/menuImage';
import { makeToken, generateQrImage } from '../src/lib/qr';

const SOURCE_DIR = 'C:/Users/mohmb/Desktop/صور_الوجبات';

function photoFor(filename: string): string | null {
  const p = path.join(SOURCE_DIR, filename);
  return fs.existsSync(p) ? p : null;
}

// كل الصور تحتها: كل "قطعة" مقصوصة من مربع مركّز على أكل فعلي (سندويشة/بطاطا/مشروب)، أبداً من
// خلفية الصورة — بس بنقسم كل مربع لأجزاء أصغر عشان يطلع 10-15 قطعة إجمالي بدل 3-4.

// برغر (burger2.png) — شبكة تغطي الصورة كاملة (٤×٣) عشان ما يضل أي جزء بدون تلوين، والأكل أصلاً
// آخذ أغلب الكادر فبمعظمها الأجزاء لسا عالبطاطا والمشروب والبرغر.
const BURGER_LAYERS: LoyaltyLayer[] = subdivide({ x0: 0.0, y0: 0.0, x1: 1.0, y1: 1.0 }, 4, 3, 'برغر');

// شاورما (shawarma2.png) — نفس الفكرة، شبكة ٣×٤ تغطي الصورة كاملة.
const SHAWARMA_LAYERS: LoyaltyLayer[] = subdivide({ x0: 0.0, y0: 0.0, x1: 1.0, y1: 1.0 }, 3, 4, 'شاورما');

// فاهيتا (fahita.png) — خبز، حشوة الدجاج والفلفل، صوص.
const FAHITA_LAYERS: LoyaltyLayer[] = [
  ...subdivide({ x0: 0.0, y0: 0.0, x1: 1.0, y1: 0.18 }, 1, 2, 'الخبز'),
  ...subdivide({ x0: 0.0, y0: 0.18, x1: 1.0, y1: 0.72 }, 3, 2, 'الحشوة'),
  ...subdivide({ x0: 0.0, y0: 0.72, x1: 1.0, y1: 1.0 }, 1, 2, 'الصوص'),
];

// ستيك (steak.png) — خلفية سودة حوالين الساندويش، فبنقص المربع لحدود الساندويش نفسه بس
// (مش الصورة كاملة زي البرغر والشاورما) عشان يكتمل بدون ما يلوّن الخلفية.
const STEAK_LAYERS: LoyaltyLayer[] = subdivide({ x0: 0.04, y0: 0.3, x1: 0.95, y1: 0.7 }, 3, 4, 'ستيك');

// Regenerates the loyalty images every run (so a rendering fix or a new source photo always
// takes effect), but only mints a QR token once — an already-printed QR must keep working.
async function enrollLoyalty(
  itemId: number,
  name: string,
  layers: LoyaltyLayer[],
  sourcePath: string | null,
  rewardType: 'free' | 'discount',
  rewardValue: string,
): Promise<string> {
  const existing = await prisma.menuItem.findUniqueOrThrow({ where: { id: itemId } });
  const qrToken = existing.qrToken ?? makeToken('MENU');
  if (!existing.qrToken) await generateQrImage(qrToken);

  const images = await generateLoyaltyImages(itemId, layers, { sourcePath, name });
  await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      qrToken,
      layers: layers as any,
      colorImage: images.colorImage,
      grayImage: images.grayImage,
      rewardType,
      rewardValue,
    },
  });
  return images.colorImage; // reuse as the general menu photo too — same real dish, one photo
}

// Same idea as enrollLoyalty, but multiple items share one printed QR — scanning it shows a
// selection screen (e.g. "أي سندويشة اشتريت؟") instead of jumping straight to one item's image.
async function enrollGroupLoyalty(
  itemId: number,
  name: string,
  layers: LoyaltyLayer[],
  sourcePath: string | null,
  rewardType: 'free' | 'discount',
  rewardValue: string,
  groupToken: string,
): Promise<string> {
  const images = await generateLoyaltyImages(itemId, layers, { sourcePath, name });
  await prisma.menuItem.update({
    where: { id: itemId },
    data: {
      qrToken: null,
      qrGroupToken: groupToken,
      layers: layers as any,
      colorImage: images.colorImage,
      grayImage: images.grayImage,
      rewardType,
      rewardValue,
    },
  });
  return images.colorImage;
}

type ItemSeed = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  emoji: string;
  bg: string;
  bg2: string;
};

async function main() {
  await prisma.restaurant.upsert({
    where: { id: 1 },
    create: { id: 1, name: 'مطعم Beem', phone: '0790000000', address: 'عمّان، الأردن' },
    update: { name: 'مطعم Beem' },
  });

  const adminPass = await bcrypt.hash('admin123', 10);
  await prisma.staff.upsert({
    where: { phone: '0790000001' },
    create: { name: 'الأدمن', phone: '0790000001', passwordHash: adminPass, role: 'admin' },
    update: {},
  });
  const cashierPass = await bcrypt.hash('cashier123', 10);
  await prisma.staff.upsert({
    where: { phone: '0790000002' },
    create: { name: 'الكاشير', phone: '0790000002', passwordHash: cashierPass, role: 'cashier' },
    update: {},
  });
  const chefPass = await bcrypt.hash('chef123', 10);
  await prisma.staff.upsert({
    where: { phone: '0790000003' },
    create: { name: 'الشيف', phone: '0790000003', passwordHash: chefPass, role: 'chef' },
    update: {},
  });

  const categories = [
    { id: 1, name: 'وجبات', sortOrder: 1 },
    { id: 2, name: 'سندويشات', sortOrder: 2 },
    { id: 3, name: 'مقبلات', sortOrder: 3 },
    { id: 4, name: 'مشروبات', sortOrder: 4 },
    { id: 5, name: 'حلويات', sortOrder: 5 },
  ];
  for (const c of categories) {
    await prisma.menuCategory.upsert({ where: { id: c.id }, create: c, update: c });
  }

  const items: ItemSeed[] = [
    // وجبات
    { id: 1, categoryId: 1, name: 'زنجر', price: 3.50, emoji: '🍗', bg: '#c0392b', bg2: '#e67e22',
      description: 'قطع دجاج مقرمشة مقلية بتتبيلة خاصة، تقدم مع بطاطا مقلية وسلطة كول سلو' },
    { id: 2, categoryId: 1, name: 'شاورما', price: 4.00, emoji: '🌯', bg: '#27ae60', bg2: '#16a085',
      description: 'شاورما دجاج مشوية عالفحم، ملفوفة بخبز طازج مع ثومية وخضار ومخلل' },
    { id: 3, categoryId: 1, name: 'برغر', price: 4.50, emoji: '🍔', bg: '#8e44ad', bg2: '#2c3e50',
      description: 'برغر لحم بقري 200غ مشوي، جبنة شيدر، خس وطماطم وبصل أحمر، صوص خاص' },
    { id: 5, categoryId: 1, name: 'مشاوي مشكل', price: 7.50, emoji: '🍢', bg: '#a0522d', bg2: '#3e2723',
      description: 'تشكيلة مشاوي (كباب، شيش طاووق، ريش)، تقدم مع أرز وسلطة وخبز' },
    { id: 6, categoryId: 1, name: 'كبسة دجاج', price: 5.00, emoji: '🍚', bg: '#d68910', bg2: '#7d6608',
      description: 'أرز بسمتي متبّل مع قطع دجاج مشوية وتوابل شرقية أصيلة' },

    // سندويشات
    { id: 4, categoryId: 2, name: 'فاهيتا', price: 2.50, emoji: '🌮', bg: '#d35400', bg2: '#f39c12',
      description: 'شرائح دجاج متبلة بالفاهيتا مع فلفل ملون وبصل، ملفوفة بخبز طري' },
    { id: 7, categoryId: 2, name: 'زنجر سندويش', price: 3.00, emoji: '🥪', bg: '#c0392b', bg2: '#e74c3c',
      description: 'قطعة زنجر مقرمشة بخبز البرغر مع خس ومايونيز حار' },
    { id: 8, categoryId: 2, name: 'كوردن بلو', price: 3.25, emoji: '🧀', bg: '#f1c40f', bg2: '#e67e22',
      description: 'دجاج محشي جبنة ولحم مقدد، مقلي حتى يصير مقرمش من برا وطري من جوا' },
    { id: 9, categoryId: 2, name: 'كريسبي ساندويش', price: 2.75, emoji: '🍗', bg: '#2980b9', bg2: '#6dd5fa',
      description: 'دجاج كريسبي مقرمش مع خس ومخلل وصوص رانش' },
    { id: 20, categoryId: 2, name: 'ستيك', price: 3.75, emoji: '🥖', bg: '#6d4c41', bg2: '#3e2723',
      description: 'شرائح ستيك مشوية مع فلفل وبصل وصوص جبنة، بخبز سندويش طويل' },

    // مقبلات
    { id: 10, categoryId: 3, name: 'بطاطا مقلية', price: 1.50, emoji: '🍟', bg: '#f39c12', bg2: '#e67e22',
      description: 'بطاطا ذهبية مقرمشة، تقدم مع كاتشب أو صوص الجبنة' },
    { id: 11, categoryId: 3, name: 'حمص بالطحينة', price: 2.00, emoji: '🥙', bg: '#cddc39', bg2: '#827717',
      description: 'حمص كريمي مع زيت زيتون وحبة حمص كاملة' },
    { id: 12, categoryId: 3, name: 'متبل', price: 2.00, emoji: '🍆', bg: '#5e35b1', bg2: '#311b92',
      description: 'باذنجان مشوي مهروس مع طحينة وثوم' },
    { id: 13, categoryId: 3, name: 'سلطة فتوش', price: 2.50, emoji: '🥗', bg: '#43a047', bg2: '#1b5e20',
      description: 'خضار طازجة مع خبز محمص وسماق ودبس رمان' },

    // مشروبات
    { id: 14, categoryId: 4, name: 'بيبسي', price: 1.00, emoji: '🥤', bg: '#c62828', bg2: '#1a1a1a',
      description: 'علبة مشروب غازي بارد' },
    { id: 15, categoryId: 4, name: 'عصير طبيعي', price: 2.00, emoji: '🧃', bg: '#fb8c00', bg2: '#e65100',
      description: 'عصير فواكه طازج — برتقال، ليمون، أو مانجو' },
    { id: 16, categoryId: 4, name: 'مياه معدنية', price: 0.50, emoji: '💧', bg: '#4fc3f7', bg2: '#0277bd',
      description: 'زجاجة مياه معدنية 500 مل' },
    { id: 17, categoryId: 4, name: 'ليموناضة نعناع', price: 2.00, emoji: '🍋', bg: '#9ccc65', bg2: '#33691e',
      description: 'ليمون طازج مع نعناع وثلج' },

    // حلويات
    { id: 18, categoryId: 5, name: 'كنافة نابلسية', price: 3.00, emoji: '🍮', bg: '#f9a825', bg2: '#e65100',
      description: 'كنافة جبنة ساخنة مغطاة بالقطر والفستق' },
    { id: 19, categoryId: 5, name: 'بقلاوة', price: 2.50, emoji: '🥮', bg: '#8d6e63', bg2: '#4e342e',
      description: 'عجينة رقيقة محشية جوز مع قطر' },
  ];

  for (const it of items) {
    const data = { categoryId: it.categoryId, name: it.name, price: it.price, description: it.description };
    await prisma.menuItem.upsert({
      where: { id: it.id },
      create: { id: it.id, ...data },
      update: data,
    });
  }

  // Loyalty photos double as the general menu photo for these real dishes — each has its own QR.
  const zingerImg = await enrollLoyalty(1, 'زنجر', evenLayers(12, 'قطعة'), null, 'free', 'وجبة زنجر مجانية');
  const shawarmaImg = await enrollLoyalty(2, 'شاورما', SHAWARMA_LAYERS, photoFor('shawarma2.png.jpeg'), 'discount', 'خصم 20% على الشاورما');
  const burgerImg = await enrollLoyalty(3, 'برغر', BURGER_LAYERS, photoFor('burger2.png.jpeg'), 'free', 'وجبة برغر مجانية');
  await prisma.menuItem.update({ where: { id: 1 }, data: { imageUrl: zingerImg } });
  await prisma.menuItem.update({ where: { id: 2 }, data: { imageUrl: shawarmaImg } });
  await prisma.menuItem.update({ where: { id: 3 }, data: { imageUrl: burgerImg } });

  // فاهيتا وستيك يتشاركوا QR واحد — تصويره بيفتح شاشة اختيار بين الاثنين.
  const existingFahita = await prisma.menuItem.findUniqueOrThrow({ where: { id: 4 } });
  const groupToken = existingFahita.qrGroupToken ?? makeToken('SANDWICH_GROUP');
  if (!existingFahita.qrGroupToken) await generateQrImage(groupToken);

  const fahitaImg = await enrollGroupLoyalty(4, 'فاهيتا', FAHITA_LAYERS, photoFor('fahita.png.jpeg'), 'free', 'سندويشة فاهيتا مجانية', groupToken);
  const steakImg = await enrollGroupLoyalty(20, 'ستيك', STEAK_LAYERS, photoFor('steak.png.jpeg'), 'free', 'سندويش ستيك مجاني', groupToken);
  await prisma.menuItem.update({ where: { id: 4 }, data: { imageUrl: fahitaImg } });
  await prisma.menuItem.update({ where: { id: 20 }, data: { imageUrl: steakImg } });

  // Everything else gets a polished placeholder card until the restaurant supplies a real photo.
  const photographed = new Set([1, 2, 3, 4, 20]);
  for (const it of items) {
    if (photographed.has(it.id)) continue;
    const cardUrl = await generateMenuCardImage(it.id, it.emoji, it.bg, it.bg2);
    await prisma.menuItem.update({ where: { id: it.id }, data: { imageUrl: cardUrl } });
  }

  const existingTable1 = await prisma.restaurantTable.findUnique({ where: { tableNumber: '1' } });
  if (!existingTable1) {
    const tableToken = makeToken('TABLE');
    await generateQrImage(tableToken);
    await prisma.restaurantTable.create({ data: { tableNumber: '1', qrToken: tableToken } });
  }

  console.log('Seed complete.', items.length, 'menu items across', categories.length, 'categories.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { upload, uploadedFileUrl } from '../lib/upload';
import { generateLoyaltyImages, evenLayers, LoyaltyLayer, versionedUrl } from '../lib/images';
import { makeToken, generateQrImage } from '../lib/qr';
import { handleDeleteError } from '../lib/prismaErrors';

function toPublicMenuItem(item: any) {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    nameEn: item.nameEn,
    description: item.description,
    descriptionEn: item.descriptionEn,
    price: item.price,
    imageUrl: versionedUrl(item.imageUrl, item.updatedAt),
    isAvailable: item.isAvailable,
    preparationTimeMinutes: item.preparationTimeMinutes,
    hasLoyalty: !!(item.qrToken || item.qrGroupToken),
  };
}

// ---------- Public ----------
export const menuRouter = Router();

menuRouter.get('/', async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { items: { where: { isAvailable: true } } },
  });
  res.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      sortOrder: c.sortOrder,
      imageUrl: c.imageUrl,
      items: c.items.map(toPublicMenuItem),
    })),
  });
});

// ---------- Admin ----------
export const adminMenuRouter = Router();
adminMenuRouter.use(requireStaff('admin'));

adminMenuRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { items: true },
  });
  res.json({ categories });
});

adminMenuRouter.get('/items/:id', async (req, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'not_found' });
  res.json({ item, qrImage: item.qrToken ? `/qrcodes/${item.qrToken}.png` : null });
});

const categorySchema = z.object({ name: z.string().min(1), sortOrder: z.number().optional() });

adminMenuRouter.post('/categories', upload.single('image'), async (req, res) => {
  const parsed = categorySchema.safeParse({ ...req.body, sortOrder: req.body.sortOrder ? Number(req.body.sortOrder) : undefined });
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const category = await prisma.menuCategory.create({
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? 0,
      imageUrl: req.file ? await uploadedFileUrl(req.file) : undefined,
    },
  });
  res.json({ category });
});

adminMenuRouter.put('/categories/:id', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, string>;
  const category = await prisma.menuCategory.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.sortOrder ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(req.file ? { imageUrl: await uploadedFileUrl(req.file) } : {}),
    },
  });
  res.json({ category });
});

adminMenuRouter.delete('/categories/:id', async (req, res) => {
  try {
    await prisma.menuCategory.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالقسم');
  }
});

const itemSchema = z.object({
  categoryId: z.coerce.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  isAvailable: z.coerce.boolean().optional(),
  preparationTimeMinutes: z.coerce.number().int().positive().optional(),
});

adminMenuRouter.post('/items', upload.single('image'), async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const item = await prisma.menuItem.create({
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      isAvailable: parsed.data.isAvailable ?? true,
      preparationTimeMinutes: parsed.data.preparationTimeMinutes,
      imageUrl: req.file ? await uploadedFileUrl(req.file) : undefined,
    },
  });
  res.json({ item });
});

adminMenuRouter.put('/items/:id', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, string>;
  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(body.categoryId ? { categoryId: Number(body.categoryId) } : {}),
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.price ? { price: Number(body.price) } : {}),
      ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable === 'true' } : {}),
      ...(body.preparationTimeMinutes ? { preparationTimeMinutes: Number(body.preparationTimeMinutes) } : {}),
      ...(req.file ? { imageUrl: await uploadedFileUrl(req.file) } : {}),
    },
  });
  res.json({ item });
});

adminMenuRouter.delete('/items/:id', async (req, res) => {
  try {
    await prisma.menuItem.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالصنف');
  }
});

// Deliberately destructive: strips this item out of every past order's line items too, so old
// orders will look incomplete (their stored subtotal/total won't match what's still shown).
// Only reachable after the client has already shown the user that warning and they chose to proceed.
adminMenuRouter.delete('/items/:id/force', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { menuItemId: id } }),
    prisma.loyaltyProgress.deleteMany({ where: { menuItemId: id } }),
    prisma.voucher.deleteMany({ where: { menuItemId: id } }),
    prisma.scanLog.deleteMany({ where: { menuItemId: id } }),
    prisma.menuItem.delete({ where: { id } }),
  ]);
  res.json({ ok: true });
});

// ---- Loyalty enrollment for a menu item ----
const loyaltySchema = z.object({
  rewardType: z.enum(['free', 'discount']),
  rewardValue: z.string().min(1),
  layerCount: z.coerce.number().int().min(2).max(12).optional(),
  layers: z.string().optional(), // JSON string of LoyaltyLayer[] for hand-picked regions
});

adminMenuRouter.post('/items/:id/loyalty', upload.single('photo'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = loyaltySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'item_not_found' });

  const layers: LoyaltyLayer[] = parsed.data.layers
    ? JSON.parse(parsed.data.layers)
    : evenLayers(parsed.data.layerCount ?? 4, 'قطعة');

  const images = await generateLoyaltyImages(id, layers, {
    sourceBuffer: req.file?.buffer ?? null,
    name: item.name,
  });

  const qrToken = item.qrToken ?? makeToken('MENU');
  if (!item.qrToken) await generateQrImage(qrToken);

  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      qrToken,
      layers,
      colorImage: images.colorImage,
      grayImage: images.grayImage,
      rewardType: parsed.data.rewardType,
      rewardValue: parsed.data.rewardValue,
    },
  });

  res.json({ item: updated, qrImage: `/qrcodes/${qrToken}.png` });
});

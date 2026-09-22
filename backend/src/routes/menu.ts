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
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } },
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

/** Ingredients whose stock can't cover an item's recipe, given each recipe line's required qty. */
function missingIngredients(recipe: { quantity: any; ingredient: { id: number; name: string; nameEn: string | null; quantityOnHand: any } }[]) {
  return recipe
    .filter((r) => Number(r.ingredient.quantityOnHand) < Number(r.quantity))
    .map((r) => ({ id: r.ingredient.id, name: r.ingredient.name, nameEn: r.ingredient.nameEn }));
}

adminMenuRouter.get('/categories', async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { recipe: { include: { ingredient: true } } },
      },
    },
  });
  res.json({
    categories: categories.map((c) => ({
      ...c,
      items: c.items.map((item) => {
        const missing = missingIngredients(item.recipe);
        return {
          ...item,
          recipe: item.recipe.map((r) => ({ ingredientId: r.ingredientId, quantity: r.quantity })),
          outOfStock: missing.length > 0,
          missingIngredients: missing,
        };
      }),
    })),
  });
});

adminMenuRouter.get('/items/:id', async (req, res) => {
  const item = await prisma.menuItem.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'not_found' });
  res.json({ item, qrImage: item.qrToken ? `/qrcodes/${item.qrToken}.png` : null });
});

const categorySchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  sortOrder: z.number().optional(),
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

adminMenuRouter.post('/categories', upload.single('image'), async (req, res) => {
  const body = req.body ?? {};
  const parsed = categorySchema.safeParse({
    ...body,
    sortOrder: body.sortOrder ? Number(body.sortOrder) : undefined,
    isActive: body.isActive === undefined ? undefined : body.isActive === 'true' || body.isActive === true,
  });
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const category = await prisma.menuCategory.create({
    data: {
      name: parsed.data.name,
      nameEn: parsed.data.nameEn,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
      imageUrl: req.file ? await uploadedFileUrl(req.file) : parsed.data.imageUrl ?? undefined,
    },
  });
  res.json({ category });
});

adminMenuRouter.put('/categories/reorder', async (req, res) => {
  const ids = z.array(z.number()).parse(req.body?.ids ?? []);
  await prisma.$transaction(
    ids.map((id, index) => prisma.menuCategory.update({ where: { id }, data: { sortOrder: index } })),
  );
  res.json({ ok: true });
});

adminMenuRouter.put('/categories/:id', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, any>;
  const category = await prisma.menuCategory.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive === 'true' || body.isActive === true } : {}),
      ...(req.file
        ? { imageUrl: await uploadedFileUrl(req.file) }
        : body.imageUrl !== undefined
          ? { imageUrl: body.imageUrl }
          : {}),
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

const recipeLineSchema = z.object({ ingredientId: z.coerce.number(), quantity: z.coerce.number().positive() });

const itemSchema = z.object({
  categoryId: z.coerce.number(),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  price: z.coerce.number().positive(),
  imageUrl: z.string().nullable().optional(),
  isAvailable: z.coerce.boolean().optional(),
  preparationTimeMinutes: z.coerce.number().int().positive().optional(),
  recipe: z.array(recipeLineSchema).optional(),
});

/** Replaces an item's whole recipe with the given lines — the editor always sends a complete
 * set rather than a delta, same reasoning as the category/item reorder endpoints. */
async function setRecipe(menuItemId: number, recipe: { ingredientId: number; quantity: number }[] | undefined) {
  if (recipe === undefined) return;
  await prisma.$transaction([
    prisma.menuItemIngredient.deleteMany({ where: { menuItemId } }),
    ...(recipe.length
      ? [
          prisma.menuItemIngredient.createMany({
            data: recipe.map((r) => ({ menuItemId, ingredientId: r.ingredientId, quantity: r.quantity })),
          }),
        ]
      : []),
  ]);
}

adminMenuRouter.post('/items', upload.single('image'), async (req, res) => {
  const body = req.body ?? {};
  const recipe = typeof body.recipe === 'string' ? JSON.parse(body.recipe) : body.recipe;
  const parsed = itemSchema.safeParse({ ...body, recipe });
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  // New item goes to the end of its category's list.
  const count = await prisma.menuItem.count({ where: { categoryId: parsed.data.categoryId } });

  const item = await prisma.menuItem.create({
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      nameEn: parsed.data.nameEn,
      description: parsed.data.description,
      descriptionEn: parsed.data.descriptionEn,
      price: parsed.data.price,
      isAvailable: parsed.data.isAvailable ?? true,
      sortOrder: count,
      preparationTimeMinutes: parsed.data.preparationTimeMinutes,
      imageUrl: req.file ? await uploadedFileUrl(req.file) : parsed.data.imageUrl ?? undefined,
    },
  });
  await setRecipe(item.id, parsed.data.recipe);
  res.json({ item });
});

adminMenuRouter.put('/items/:id', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, any>;
  const recipe = typeof body.recipe === 'string' ? JSON.parse(body.recipe) : body.recipe;
  const parsedRecipe = recipe !== undefined ? z.array(recipeLineSchema).parse(recipe) : undefined;

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(body.categoryId !== undefined ? { categoryId: Number(body.categoryId) } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.nameEn !== undefined ? { nameEn: body.nameEn } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.descriptionEn !== undefined ? { descriptionEn: body.descriptionEn } : {}),
      ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      ...(body.isAvailable !== undefined ? { isAvailable: body.isAvailable === 'true' || body.isAvailable === true } : {}),
      ...(body.preparationTimeMinutes ? { preparationTimeMinutes: Number(body.preparationTimeMinutes) } : {}),
      ...(req.file
        ? { imageUrl: await uploadedFileUrl(req.file) }
        : body.imageUrl !== undefined
          ? { imageUrl: body.imageUrl }
          : {}),
    },
  });
  await setRecipe(id, parsedRecipe);
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
    prisma.menuItemIngredient.deleteMany({ where: { menuItemId: id } }),
    prisma.menuItem.delete({ where: { id } }),
  ]);
  res.json({ ok: true });
});

adminMenuRouter.put('/categories/:categoryId/items/reorder', async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  const ids = z.array(z.number()).parse(req.body?.ids ?? []);
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.menuItem.update({ where: { id, categoryId }, data: { sortOrder: index } }),
    ),
  );
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

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { handleDeleteError } from '../lib/prismaErrors';

export const adminInventoryRouter = Router();
adminInventoryRouter.use(requireStaff('admin', 'manager'));

/** Maps a DB row (quantityOnHand) to the shape the admin panel expects (quantity + status flags). */
function toPublicIngredient(item: any) {
  const quantity = Number(item.quantityOnHand);
  const minQuantity = Number(item.minQuantity);
  return {
    id: item.id,
    name: item.name,
    nameEn: item.nameEn,
    unit: item.unit,
    quantity: item.quantityOnHand,
    minQuantity: item.minQuantity,
    supplierId: item.supplierId,
    isOut: quantity <= 0,
    isLow: quantity > 0 && quantity <= minQuantity,
    usedBy: (item.usedIn ?? []).map((r: any) => ({ id: r.menuItemId })),
  };
}

adminInventoryRouter.get('/', async (_req, res) => {
  const items = await prisma.inventoryItem.findMany({
    include: { usedIn: { select: { menuItemId: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ ingredients: items.map(toPublicIngredient) });
});

const itemSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  unit: z.string().min(1),
  quantity: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().min(0).optional(),
  supplierId: z.coerce.number().optional(),
});

adminInventoryRouter.post('/', async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const item = await prisma.inventoryItem.create({
    data: {
      name: parsed.data.name,
      nameEn: parsed.data.nameEn,
      unit: parsed.data.unit,
      quantityOnHand: parsed.data.quantity ?? 0,
      minQuantity: parsed.data.minQuantity ?? 0,
      supplierId: parsed.data.supplierId,
    },
  });
  res.json({ ingredient: toPublicIngredient(item) });
});

const patchSchema = itemSchema.partial();

adminInventoryRouter.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  // A bare `{ quantity }` patch is a stock-take: it replaces the count outright and is logged
  // as its own movement, same as the delivery/adjust endpoint below logs its delta.
  if (parsed.data.quantity !== undefined && Object.keys(req.body).length === 1) {
    const current = await prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
    const change = parsed.data.quantity - Number(current.quantityOnHand);
    const staffId = (req.auth as any).staffId;
    const [item] = await prisma.$transaction([
      prisma.inventoryItem.update({ where: { id }, data: { quantityOnHand: parsed.data.quantity } }),
      ...(change !== 0
        ? [prisma.inventoryMovement.create({ data: { itemId: id, change, reason: 'stock_take', staffId } })]
        : []),
    ]);
    return res.json({ ingredient: toPublicIngredient(item) });
  }

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.nameEn !== undefined ? { nameEn: parsed.data.nameEn } : {}),
      ...(parsed.data.unit !== undefined ? { unit: parsed.data.unit } : {}),
      ...(parsed.data.minQuantity !== undefined ? { minQuantity: parsed.data.minQuantity } : {}),
      ...(parsed.data.supplierId !== undefined ? { supplierId: parsed.data.supplierId } : {}),
    },
  });
  res.json({ ingredient: toPublicIngredient(item) });
});

adminInventoryRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.inventoryItem.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالصنف');
  }
});

const adjustSchema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0, 'amount_cannot_be_zero'),
  reason: z.string().optional(),
});

/** Receiving a delivery — a positive delta added to what's on the shelf. */
adminInventoryRouter.post('/:id/adjust', async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const id = Number(req.params.id);
  const staffId = (req.auth as any).staffId;

  const [item] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: { increment: parsed.data.amount } },
    }),
    prisma.inventoryMovement.create({
      data: { itemId: id, change: parsed.data.amount, reason: parsed.data.reason ?? 'purchase', staffId },
    }),
  ]);
  res.json({ ingredient: toPublicIngredient(item) });
});

adminInventoryRouter.get('/movements', async (req, res) => {
  const direction = req.query.direction as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 60;

  const [movements, inCount, outCount, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where: direction === 'in' ? { change: { gt: 0 } } : direction === 'out' ? { change: { lt: 0 } } : {},
      include: { item: true, staff: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.inventoryMovement.count({ where: { change: { gt: 0 } } }),
    prisma.inventoryMovement.count({ where: { change: { lt: 0 } } }),
    prisma.inventoryMovement.count(),
  ]);

  res.json({
    log: movements.map((m) => ({
      id: m.id,
      ingredient: { id: m.item.id, name: m.item.name, nameEn: m.item.nameEn, unit: m.item.unit },
      direction: Number(m.change) >= 0 ? 'in' : 'out',
      quantity: Math.abs(Number(m.change)),
      reason: m.reason ?? 'manual',
      staff: m.staff,
      at: m.createdAt,
    })),
    counts: { all: total, in: inCount, out: outCount },
  });
});

// Kept for any existing caller hitting the old per-item path directly.
adminInventoryRouter.get('/:id/movements', async (req, res) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: { itemId: Number(req.params.id) },
    include: { staff: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ movements });
});

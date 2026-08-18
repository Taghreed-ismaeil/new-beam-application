import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { handleDeleteError } from '../lib/prismaErrors';

export const adminInventoryRouter = Router();
adminInventoryRouter.use(requireStaff('admin', 'manager'));

adminInventoryRouter.get('/', async (_req, res) => {
  const items = await prisma.inventoryItem.findMany({
    include: { supplier: true },
    orderBy: { name: 'asc' },
  });
  res.json({
    items: items.map((i) => ({ ...i, lowStock: Number(i.quantityOnHand) <= Number(i.minQuantity) })),
  });
});

const itemSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  minQuantity: z.number().min(0).optional(),
  supplierId: z.number().optional(),
});

adminInventoryRouter.post('/', async (req, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const item = await prisma.inventoryItem.create({
    data: {
      name: parsed.data.name,
      unit: parsed.data.unit,
      minQuantity: parsed.data.minQuantity ?? 0,
      supplierId: parsed.data.supplierId,
    },
  });
  res.json({ item });
});

adminInventoryRouter.put('/:id', async (req, res) => {
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const item = await prisma.inventoryItem.update({ where: { id: Number(req.params.id) }, data: parsed.data });
  res.json({ item });
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
  change: z.number().refine((n) => n !== 0, 'change_cannot_be_zero'),
  reason: z.string().optional(),
});

adminInventoryRouter.post('/:id/adjust', async (req, res) => {
  const parsed = adjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const id = Number(req.params.id);
  const staffId = (req.auth as any).staffId;

  const [item] = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: { increment: parsed.data.change } },
    }),
    prisma.inventoryMovement.create({
      data: { itemId: id, change: parsed.data.change, reason: parsed.data.reason, staffId },
    }),
  ]);
  res.json({ item, lowStock: Number(item.quantityOnHand) <= Number(item.minQuantity) });
});

adminInventoryRouter.get('/:id/movements', async (req, res) => {
  const movements = await prisma.inventoryMovement.findMany({
    where: { itemId: Number(req.params.id) },
    include: { staff: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ movements });
});

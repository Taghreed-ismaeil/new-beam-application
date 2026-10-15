import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';

// Purchase orders placed with suppliers — the Suppliers → Orders tab in app/admin/suppliers.jsx.
// Receiving an order credits every line to inventory in the same transaction as the status
// change, so stock can never be added twice or left out.
export const adminPurchaseOrdersRouter = Router();
adminPurchaseOrdersRouter.use(requireStaff('admin', 'manager'));

const include = {
  supplier: { select: { id: true, name: true } },
  createdByStaff: { select: { id: true, name: true } },
  items: {
    include: { ingredient: { select: { id: true, name: true, nameEn: true, unit: true } } },
    orderBy: { id: 'asc' as const },
  },
};

type Loaded = Awaited<ReturnType<typeof loadOrder>>;

function loadOrder(id: number) {
  return prisma.purchaseOrder.findUnique({ where: { id }, include });
}

function toPublic(o: NonNullable<Loaded>) {
  const items = o.items.map((l) => ({
    ingredientId: l.ingredientId,
    ingredient: l.ingredient,
    quantity: Number(l.quantity),
    unitCost: Number(l.unitCost),
  }));
  return {
    id: o.id,
    status: o.status,
    supplier: o.supplier,
    note: o.note,
    orderedAt: o.orderedAt,
    receivedAt: o.receivedAt,
    cancelledAt: o.cancelledAt,
    createdBy: o.createdByStaff,
    items,
    totalCost: Math.round(items.reduce((sum, l) => sum + l.quantity * l.unitCost, 0) * 100) / 100,
  };
}

const STATUSES = ['pending', 'received', 'cancelled'] as const;

adminPurchaseOrdersRouter.get('/', async (req, res) => {
  const status = req.query.status as string | undefined;
  if (status && !STATUSES.includes(status as any)) return res.status(400).json({ error: 'invalid_status' });

  const [orders, grouped] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: status ? { status: status as (typeof STATUSES)[number] } : {},
      include,
      orderBy: { orderedAt: 'desc' },
      take: 200,
    }),
    prisma.purchaseOrder.groupBy({ by: ['status'], _count: true }),
  ]);

  const counts: Record<string, number> = { all: 0 };
  for (const row of grouped) {
    counts[row.status] = row._count;
    counts.all += row._count;
  }
  res.json({ orders: orders.map(toPublic), counts });
});

const createSchema = z.object({
  supplierId: z.coerce.number().int().positive(),
  note: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        ingredientId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().positive(),
        unitCost: z.coerce.number().min(0).default(0),
      }),
    )
    .min(1),
});

adminPurchaseOrdersRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const { supplierId, note, items } = parsed.data;

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) return res.status(404).json({ error: 'supplier_not_found' });

  const ids = [...new Set(items.map((l) => l.ingredientId))];
  if (ids.length !== items.length) return res.status(400).json({ error: 'duplicate_ingredient' });
  const found = await prisma.inventoryItem.count({ where: { id: { in: ids } } });
  if (found !== ids.length) return res.status(404).json({ error: 'ingredient_not_found' });

  const created = await prisma.purchaseOrder.create({
    data: {
      supplierId,
      note: note?.trim() || null,
      createdByStaffId: (req.auth as any).staffId ?? null,
      items: { create: items.map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity, unitCost: l.unitCost })) },
    },
  });
  res.status(201).json({ order: toPublic((await loadOrder(created.id))!) });
});

const statusSchema = z.object({ status: z.enum(['received', 'cancelled']) });

adminPurchaseOrdersRouter.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const id = Number(req.params.id);

  const order = await loadOrder(id);
  if (!order) return res.status(404).json({ error: 'not_found' });
  // only a pending order can move — a received order has already been added to stock
  if (order.status !== 'pending') return res.status(409).json({ error: 'illegal_transition' });

  const staffId = (req.auth as any).staffId ?? null;
  const now = new Date();

  if (parsed.data.status === 'cancelled') {
    await prisma.purchaseOrder.update({ where: { id }, data: { status: 'cancelled', cancelledAt: now } });
  } else {
    const credited = await prisma.$transaction(async (tx) => {
      // conditional update so two simultaneous "received" taps can't both credit stock
      const claimed = await tx.purchaseOrder.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'received', receivedAt: now },
      });
      if (claimed.count === 0) return false;
      for (const l of order.items) {
        await tx.inventoryItem.update({
          where: { id: l.ingredientId },
          data: { quantityOnHand: { increment: l.quantity } },
        });
        await tx.inventoryMovement.create({
          data: { itemId: l.ingredientId, change: l.quantity, reason: 'purchase_order', staffId },
        });
      }
      return true;
    });
    if (!credited) return res.status(409).json({ error: 'illegal_transition' });
  }

  res.json({ order: toPublic((await loadOrder(id))!) });
});

adminPurchaseOrdersRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) return res.status(404).json({ error: 'not_found' });
  // received orders are part of the stock history; only undo an order nothing came of yet
  if (order.status === 'received') return res.status(409).json({ error: 'order_received' });
  await prisma.purchaseOrder.delete({ where: { id } });
  res.json({ ok: true });
});

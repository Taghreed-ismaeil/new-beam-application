import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireUser, requireStaff } from '../middleware/auth';
import { upload, uploadedFileUrl } from '../lib/upload';
import { emitOrderEvent } from '../lib/socket';

const orderItemSchema = z.object({
  menuItemId: z.number(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

const createOrderSchema = z.object({
  orderType: z.enum(['pickup', 'delivery', 'dine_in']),
  paymentMethod: z.enum(['cash', 'cliq']),
  tableId: z.number().optional(),
  deliveryAddress: z.string().optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

async function buildOrderPayload(items: z.infer<typeof orderItemSchema>[]) {
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: items.map((i) => i.menuItemId) } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const lines = items.map((i) => {
    const menuItem = byId.get(i.menuItemId);
    if (!menuItem) throw new Error(`menu_item_not_found:${i.menuItemId}`);
    if (!menuItem.isAvailable) throw new Error(`menu_item_unavailable:${i.menuItemId}`);
    return {
      menuItemId: menuItem.id,
      nameSnapshot: menuItem.name,
      unitPriceSnapshot: menuItem.price,
      quantity: i.quantity,
      notes: i.notes,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + Number(l.unitPriceSnapshot) * l.quantity, 0);
  return { lines, subtotal };
}

// ---------- Customer ----------
export const ordersRouter = Router();
ordersRouter.use(requireUser);

ordersRouter.post('/', async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const data = parsed.data;

  if (data.orderType === 'delivery' && !data.deliveryAddress) {
    return res.status(400).json({ error: 'delivery_address_required' });
  }
  if (data.orderType === 'dine_in' && !data.tableId) {
    return res.status(400).json({ error: 'table_required' });
  }

  let payload;
  try {
    payload = await buildOrderPayload(data.items);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  const userId = (req.auth as any).userId;
  const order = await prisma.order.create({
    data: {
      userId,
      orderType: data.orderType,
      tableId: data.tableId,
      deliveryAddress: data.deliveryAddress,
      deliveryLat: data.deliveryLat,
      deliveryLng: data.deliveryLng,
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentMethod === 'cliq' ? 'awaiting_confirmation' : 'unpaid',
      subtotal: payload.subtotal,
      discountTotal: 0,
      total: payload.subtotal,
      notes: data.notes,
      items: { create: payload.lines },
      statusLogs: { create: { status: 'pending' } },
    },
    include: { items: true },
  });

  emitOrderEvent('order:new', order);
  res.json({ order });
});

ordersRouter.post('/:id/payment-proof', upload.single('proof'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file_required' });
  const id = Number(req.params.id);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== (req.auth as any).userId) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.order.update({
    where: { id },
    data: { paymentProofUrl: await uploadedFileUrl(req.file) },
  });
  res.json({ order: updated });
});

ordersRouter.get('/mine', async (req, res) => {
  const userId = (req.auth as any).userId;
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders });
});

ordersRouter.get('/:id', async (req, res) => {
  const userId = (req.auth as any).userId;
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: { items: true, statusLogs: true, table: true },
  });
  if (!order || order.userId !== userId) return res.status(404).json({ error: 'not_found' });
  res.json({ order });
});

// ---------- Staff ----------
export const adminOrdersRouter = Router();

adminOrdersRouter.get('/', requireStaff(), async (req, res) => {
  const status = req.query.status as string | undefined;
  const orderType = req.query.orderType as string | undefined;
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(orderType ? { orderType: orderType as any } : {}),
    },
    include: { items: true, user: { select: { id: true, name: true, phone: true, createdAt: true } }, table: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ orders });
});

const statusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']),
});

adminOrdersRouter.patch('/:id/status', requireStaff('admin', 'chef'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const id = Number(req.params.id);
  const staffId = (req.auth as any).staffId;

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      statusLogs: { create: { status: parsed.data.status, changedByStaffId: staffId } },
    },
    include: { items: true },
  });

  emitOrderEvent('order:updated', order);
  res.json({ order });
});

adminOrdersRouter.patch('/:id/confirm-payment', requireStaff('admin', 'cashier'), async (req, res) => {
  const id = Number(req.params.id);
  const staffId = (req.auth as any).staffId;

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const [order] = await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: { paymentStatus: 'paid', confirmedByStaffId: staffId },
    }),
    prisma.payment.create({
      data: {
        orderId: id,
        amount: existing.total,
        method: existing.paymentMethod,
        status: 'paid',
        proofUrl: existing.paymentProofUrl,
        confirmedByStaffId: staffId,
        confirmedAt: new Date(),
      },
    }),
  ]);

  emitOrderEvent('order:updated', order);
  res.json({ order });
});

const waiterSchema = z.object({ waiterId: z.number().nullable() });

adminOrdersRouter.patch('/:id/waiter', requireStaff('admin', 'manager'), async (req, res) => {
  const parsed = waiterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const order = await prisma.order.update({
    where: { id: Number(req.params.id) },
    data: { waiterId: parsed.data.waiterId },
  });

  emitOrderEvent('order:updated', order);
  res.json({ order });
});

const counterSaleSchema = z.object({
  phone: z.string().min(6),
  name: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

adminOrdersRouter.post('/counter-sale', requireStaff('admin', 'cashier'), async (req, res) => {
  const parsed = counterSaleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const staffId = (req.auth as any).staffId;

  const userSelect = { id: true, name: true, phone: true, createdAt: true } as const;
  let user = await prisma.user.findUnique({ where: { phone: parsed.data.phone }, select: userSelect });
  if (!user) {
    if (!parsed.data.name) return res.status(400).json({ error: 'name_required_for_new_customer' });
    user = await prisma.user.create({ data: { phone: parsed.data.phone, name: parsed.data.name }, select: userSelect });
  }

  let payload;
  try {
    payload = await buildOrderPayload(parsed.data.items);
  } catch (e: any) {
    return res.status(400).json({ error: e.message });
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      orderType: 'counter',
      status: 'completed',
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      confirmedByStaffId: staffId,
      subtotal: payload.subtotal,
      discountTotal: 0,
      total: payload.subtotal,
      items: { create: payload.lines },
      statusLogs: { create: { status: 'completed', changedByStaffId: staffId } },
    },
    include: { items: true },
  });

  res.json({ order, user });
});

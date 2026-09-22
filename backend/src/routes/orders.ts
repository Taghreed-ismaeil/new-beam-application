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
    if (!menuItem) {
      const err: any = new Error('item_unavailable');
      err.item = `#${i.menuItemId}`;
      throw err;
    }
    if (!menuItem.isAvailable) {
      const err: any = new Error('item_unavailable');
      err.item = menuItem.name;
      throw err;
    }
    return {
      menuItemId: menuItem.id,
      nameSnapshot: menuItem.name,
      nameEnSnapshot: menuItem.nameEn,
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

  if (!data.items.length) return res.status(400).json({ error: 'empty_order' });

  let payload;
  try {
    payload = await buildOrderPayload(data.items);
  } catch (e: any) {
    return res.status(400).json({ error: e.message, item: e.item });
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
    include: { items: true, statusLogs: true, table: true, driver: { select: { id: true, name: true, phone: true } } },
  });
  if (!order || order.userId !== userId) return res.status(404).json({ error: 'not_found' });
  res.json({ order });
});

// ---------- Staff ----------
export const adminOrdersRouter = Router();

const ORDER_INCLUDE = {
  items: true,
  user: { select: { id: true, name: true, phone: true, createdAt: true } },
  table: true,
  driver: { select: { id: true, name: true, phone: true } },
} as const;

// The linear kitchen/delivery flow — "what's the one next step from here" — per order type.
// Terminal statuses (last entry, plus 'cancelled') have no next step.
function flowFor(orderType: string): string[] {
  return orderType === 'delivery'
    ? ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed']
    : ['pending', 'accepted', 'preparing', 'ready', 'completed'];
}

function computeCan(order: { status: string; orderType: string; paymentStatus: string }, role: string) {
  const terminal = order.status === 'completed' || order.status === 'cancelled';
  let setStatus: string[] = [];
  if (!terminal) {
    if (role === 'driver') {
      const next = DRIVER_ALLOWED_TRANSITIONS[order.status];
      if (next) setStatus = [next];
    } else if (role === 'admin' || role === 'chef') {
      const flow = flowFor(order.orderType);
      const idx = flow.indexOf(order.status);
      if (idx !== -1 && idx < flow.length - 1) setStatus = [flow[idx + 1]];
    }
  }
  return {
    setStatus,
    takePayment: (role === 'admin' || role === 'cashier') && order.paymentStatus !== 'paid',
    cancel: role === 'admin' && !terminal,
  };
}

function toAdminOrder(order: any, role: string) {
  return {
    ...order,
    customerName: order.customerName ?? order.user?.name ?? null,
    customerPhone: order.user?.phone ?? null,
    tableNumber: order.table?.tableNumber ?? null,
    source: order.orderType === 'counter' ? 'counter' : 'app',
    deliveryFee: 0,
    items: order.items.map((i: any) => ({
      ...i,
      name: i.nameSnapshot,
      nameEn: i.nameEnSnapshot,
      unitPrice: i.unitPriceSnapshot,
    })),
    can: computeCan(order, role),
  };
}

adminOrdersRouter.get('/', requireStaff(), async (req, res) => {
  const status = req.query.status as string | undefined;
  const orderType = req.query.orderType as string | undefined;
  const search = (req.query.search as string | undefined)?.trim();
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const role = (req.auth as any).role;

  const statusFilter =
    !status || status === 'all' ? {} : status === 'open' ? { status: { notIn: ['completed', 'cancelled'] as any } } : { status: status as any };

  const searchFilter = search
    ? {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' as const } },
          { user: { name: { contains: search, mode: 'insensitive' as const } } },
          { user: { phone: { contains: search } } },
          ...(Number.isFinite(Number(search)) ? [{ id: Number(search) }] : []),
        ],
      }
    : {};

  const where = { ...statusFilter, ...(orderType ? { orderType: orderType as any } : {}), ...searchFilter };

  const [orders, total, byStatus] = await Promise.all([
    prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ['status'], _count: true }),
  ]);

  const counts: Record<string, number> = { all: 0 };
  for (const row of byStatus) {
    counts[row.status] = row._count;
    counts.all += row._count;
    if (row.status !== 'completed' && row.status !== 'cancelled') counts.open = (counts.open ?? 0) + row._count;
  }

  res.json({ orders: orders.map((o) => toAdminOrder(o, role)), total, counts });
});

// A driver only ever needs their own assigned deliveries, never the full
// order list — filtering server-side by req.auth.staffId (not a client-
// supplied query param) keeps one driver from ever seeing another
// customer's order just by guessing/omitting a filter.
adminOrdersRouter.get('/driver/mine', requireStaff('driver'), async (req, res) => {
  const staffId = (req.auth as any).staffId;
  const orders = await prisma.order.findMany({
    where: { driverId: staffId, orderType: 'delivery' },
    include: { items: true, user: { select: { id: true, name: true, phone: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ orders });
});

// Registered after the /driver/mine literal path above so that path keeps
// matching first — otherwise Express would treat "driver" as this route's
// :id param and this would swallow that request instead.
adminOrdersRouter.get('/:id', requireStaff(), async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: ORDER_INCLUDE });
  if (!order) return res.status(404).json({ error: 'not_found' });
  res.json({ order: toAdminOrder(order, (req.auth as any).role) });
});

const statusSchema = z.object({
  status: z.enum(['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']),
  reason: z.string().optional(),
});

// A driver moving an order forward can only ever do the two steps that are
// actually theirs to do — pick it up, then mark it dropped off — never any
// other transition, and only for the delivery assigned to them.
const DRIVER_ALLOWED_TRANSITIONS: Record<string, string> = {
  ready: 'out_for_delivery',
  out_for_delivery: 'completed',
};

adminOrdersRouter.patch('/:id/status', requireStaff('admin', 'chef', 'driver'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const id = Number(req.params.id);
  const staffId = (req.auth as any).staffId;
  const role = (req.auth as any).role;

  if (parsed.data.status === 'cancelled') {
    if (role !== 'admin') return res.status(403).json({ error: 'role_cannot_set_status' });
    if (!parsed.data.reason?.trim()) return res.status(400).json({ error: 'reason_required' });
  }

  if (role === 'driver') {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing || existing.driverId !== staffId) return res.status(404).json({ error: 'not_found' });
    if (DRIVER_ALLOWED_TRANSITIONS[existing.status] !== parsed.data.status) {
      return res.status(403).json({ error: 'role_cannot_set_status' });
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === 'cancelled' ? { cancelReason: parsed.data.reason } : {}),
      statusLogs: { create: { status: parsed.data.status, changedByStaffId: staffId } },
    },
    include: ORDER_INCLUDE,
  });

  emitOrderEvent('order:updated', order);
  res.json({ order: toAdminOrder(order, role) });
});

const confirmPaymentSchema = z.object({ method: z.enum(['cash', 'cliq', 'card']).optional() });

adminOrdersRouter.patch('/:id/confirm-payment', requireStaff('admin', 'cashier'), async (req, res) => {
  const id = Number(req.params.id);
  const staffId = (req.auth as any).staffId;
  const parsed = confirmPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });
  if (existing.paymentStatus === 'paid') return res.status(400).json({ error: 'already_paid' });

  const method = parsed.data.method ?? existing.paymentMethod;
  const [order] = await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: { paymentStatus: 'paid', paymentMethod: method, confirmedByStaffId: staffId },
      include: ORDER_INCLUDE,
    }),
    prisma.payment.create({
      data: {
        orderId: id,
        amount: existing.total,
        method,
        status: 'paid',
        proofUrl: existing.paymentProofUrl,
        confirmedByStaffId: staffId,
        confirmedAt: new Date(),
      },
    }),
  ]);

  emitOrderEvent('order:updated', order);
  res.json({ order: toAdminOrder(order, (req.auth as any).role) });
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

const driverSchema = z.object({ driverId: z.number().nullable() });

adminOrdersRouter.patch('/:id/driver', requireStaff('admin', 'manager'), async (req, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  // Reassigning/clearing the driver also clears their last known position —
  // a stale pin from the previous driver would be actively misleading on the
  // customer's tracking map.
  const order = await prisma.order.update({
    where: { id: Number(req.params.id) },
    data: { driverId: parsed.data.driverId, driverLat: null, driverLng: null, driverLocationAt: null },
  });

  emitOrderEvent('order:updated', order);
  res.json({ order });
});

const locationSchema = z.object({ lat: z.number(), lng: z.number() });

adminOrdersRouter.patch('/:id/location', requireStaff('driver'), async (req, res) => {
  const parsed = locationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const id = Number(req.params.id);
  const staffId = (req.auth as any).staffId;

  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing || existing.driverId !== staffId) return res.status(404).json({ error: 'not_found' });

  const order = await prisma.order.update({
    where: { id },
    data: { driverLat: parsed.data.lat, driverLng: parsed.data.lng, driverLocationAt: new Date() },
  });

  emitOrderEvent('order:updated', order);
  res.json({ order });
});

const counterSaleSchema = z.object({
  // A walk-in sale doesn't need a registered customer — just a name for the receipt, if given.
  customerName: z.string().optional(),
  paymentMethod: z.enum(['cash', 'cliq', 'card']).default('cash'),
  paymentStatus: z.enum(['paid', 'unpaid']).default('paid'),
  items: z.array(orderItemSchema).min(1),
});

adminOrdersRouter.post('/counter-sale', requireStaff('admin', 'cashier'), async (req, res) => {
  const parsed = counterSaleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  if (!parsed.data.items.length) return res.status(400).json({ error: 'empty_order' });
  const staffId = (req.auth as any).staffId;

  let payload;
  try {
    payload = await buildOrderPayload(parsed.data.items);
  } catch (e: any) {
    return res.status(400).json({ error: e.message, item: e.item });
  }

  const order = await prisma.order.create({
    data: {
      orderType: 'counter',
      status: 'completed',
      customerName: parsed.data.customerName,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: parsed.data.paymentStatus === 'paid' ? 'paid' : 'unpaid',
      confirmedByStaffId: parsed.data.paymentStatus === 'paid' ? staffId : undefined,
      subtotal: payload.subtotal,
      discountTotal: 0,
      total: payload.subtotal,
      items: { create: payload.lines },
      statusLogs: { create: { status: 'completed', changedByStaffId: staffId } },
    },
    include: ORDER_INCLUDE,
  });

  res.json({ order: toAdminOrder(order, (req.auth as any).role) });
});

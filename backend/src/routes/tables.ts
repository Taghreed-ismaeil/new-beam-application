import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { makeToken, generateQrImage } from '../lib/qr';
import { handleDeleteError } from '../lib/prismaErrors';
import { emitTableEvent } from '../lib/socket';

// Public — resolving a scanned table QR to its table info (for the dine-in checkout step).
export const tablesRouter = Router();

tablesRouter.get('/resolve/:token', async (req, res) => {
  const table = await prisma.restaurantTable.findUnique({ where: { qrToken: req.params.token } });
  if (!table) return res.status(404).json({ error: 'invalid_qr' });
  res.json({ table });
});

export const adminTablesRouter = Router();
adminTablesRouter.use(requireStaff('admin', 'manager', 'waiter'));

// The floor plan only ever shows three plain states — "reserved" is driven entirely by an
// active booking (see reservations.ts), never set here directly.
const DB_TO_API_STATUS: Record<string, string> = { available: 'free', occupied: 'occupied', reserved: 'reserved' };
const API_TO_DB_STATUS: Record<string, string> = { free: 'available', occupied: 'occupied', reserved: 'reserved' };

async function toAdminTable(table: any) {
  let holder: { name: string } | null = null;
  if (table.status !== 'available') {
    const reservation = await prisma.reservation.findFirst({
      where: { tableId: table.id, status: { in: ['confirmed', 'seated'] } },
      include: { user: { select: { name: true } } },
      orderBy: { reservationTime: 'desc' },
    });
    if (reservation) holder = { name: reservation.guestName ?? reservation.user?.name ?? '' };
  }
  return {
    id: table.id,
    number: table.tableNumber,
    seats: table.seats,
    status: DB_TO_API_STATUS[table.status] ?? 'free',
    holder,
  };
}

adminTablesRouter.get('/', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({ orderBy: { tableNumber: 'asc' } });
  const withHolders = await Promise.all(tables.map(toAdminTable));
  const summary = { free: 0, reserved: 0, occupied: 0 } as Record<string, number>;
  for (const t of withHolders) summary[t.status] = (summary[t.status] ?? 0) + 1;
  res.json({ tables: withHolders.map((t) => ({ ...t, qrImage: undefined })), summary });
});

const tableSchema = z.object({ tableNumber: z.string().min(1), seats: z.number().int().positive().optional() });

adminTablesRouter.post('/', requireStaff('admin'), async (req, res) => {
  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const qrToken = makeToken('TABLE');
  await generateQrImage(qrToken);
  const table = await prisma.restaurantTable.create({
    data: { tableNumber: parsed.data.tableNumber, seats: parsed.data.seats, qrToken },
  });
  res.json({ table: await toAdminTable(table), qrImage: `/qrcodes/${qrToken}.png` });
});

const tableUpdateSchema = z.object({
  tableNumber: z.string().min(1).optional(),
  seats: z.number().int().positive().nullable().optional(),
  status: z.enum(['free', 'occupied', 'reserved']).optional(),
});

adminTablesRouter.patch('/:id', async (req, res) => {
  const parsed = tableUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const { status, ...rest } = parsed.data;
  const table = await prisma.restaurantTable.update({
    where: { id: Number(req.params.id) },
    data: { ...rest, ...(status ? { status: API_TO_DB_STATUS[status] as any } : {}) },
  });
  emitTableEvent('table:updated', table);
  res.json({ table: await toAdminTable(table) });
});

adminTablesRouter.delete('/:id', requireStaff('admin'), async (req, res) => {
  try {
    await prisma.restaurantTable.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالطاولة');
  }
});

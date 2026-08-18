import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { makeToken, generateQrImage } from '../lib/qr';
import { handleDeleteError } from '../lib/prismaErrors';

// Public — resolving a scanned table QR to its table info (for the dine-in checkout step).
export const tablesRouter = Router();

tablesRouter.get('/resolve/:token', async (req, res) => {
  const table = await prisma.restaurantTable.findUnique({ where: { qrToken: req.params.token } });
  if (!table) return res.status(404).json({ error: 'invalid_qr' });
  res.json({ table });
});

export const adminTablesRouter = Router();
adminTablesRouter.use(requireStaff('admin'));

adminTablesRouter.get('/', async (_req, res) => {
  const tables = await prisma.restaurantTable.findMany({ orderBy: { tableNumber: 'asc' } });
  res.json({ tables: tables.map((t) => ({ ...t, qrImage: `/qrcodes/${t.qrToken}.png` })) });
});

const tableSchema = z.object({ tableNumber: z.string().min(1), seats: z.number().int().positive().optional() });

adminTablesRouter.post('/', async (req, res) => {
  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const qrToken = makeToken('TABLE');
  await generateQrImage(qrToken);
  const table = await prisma.restaurantTable.create({
    data: { tableNumber: parsed.data.tableNumber, seats: parsed.data.seats, qrToken },
  });
  res.json({ table, qrImage: `/qrcodes/${qrToken}.png` });
});

const tableUpdateSchema = z.object({
  tableNumber: z.string().min(1).optional(),
  seats: z.number().int().positive().nullable().optional(),
  status: z.enum(['available', 'occupied', 'reserved']).optional(),
});

adminTablesRouter.patch('/:id', async (req, res) => {
  const parsed = tableUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const table = await prisma.restaurantTable.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json({ table });
});

adminTablesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.restaurantTable.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالطاولة');
  }
});

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireUser, requireStaff } from '../middleware/auth';
import { emitReservationEvent } from '../lib/socket';

// ---------- Customer ----------
export const reservationsRouter = Router();
reservationsRouter.use(requireUser);

const createSchema = z.object({
  partySize: z.number().int().positive(),
  reservationTime: z.string().datetime().or(z.string().min(1)),
  notes: z.string().optional(),
});

reservationsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const userId = (req.auth as any).userId;

  const reservation = await prisma.reservation.create({
    data: {
      userId,
      partySize: parsed.data.partySize,
      reservationTime: new Date(parsed.data.reservationTime),
      notes: parsed.data.notes,
    },
  });
  emitReservationEvent('reservation:new', reservation);
  res.json({ reservation });
});

reservationsRouter.get('/mine', async (req, res) => {
  const userId = (req.auth as any).userId;
  const reservations = await prisma.reservation.findMany({
    where: { userId },
    include: { table: true },
    orderBy: { reservationTime: 'desc' },
  });
  res.json({ reservations });
});

// ---------- Staff ----------
export const adminReservationsRouter = Router();
adminReservationsRouter.use(requireStaff('admin', 'manager', 'waiter'));

adminReservationsRouter.get('/', async (req, res) => {
  const status = req.query.status as string | undefined;
  const date = req.query.date as string | undefined; // YYYY-MM-DD

  let dateFilter = {};
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    dateFilter = { reservationTime: { gte: start, lte: end } };
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...dateFilter,
    },
    include: { user: { select: { id: true, name: true, phone: true, createdAt: true } }, table: true },
    orderBy: { reservationTime: 'asc' },
    take: 200,
  });
  res.json({ reservations });
});

const guestCreateSchema = z.object({
  guestName: z.string().min(1),
  guestPhone: z.string().min(6),
  partySize: z.number().int().positive(),
  reservationTime: z.string().min(1),
  tableId: z.number().optional(),
  notes: z.string().optional(),
});

adminReservationsRouter.post('/', async (req, res) => {
  const parsed = guestCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const staffId = (req.auth as any).staffId;

  const reservation = await prisma.reservation.create({
    data: {
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone,
      partySize: parsed.data.partySize,
      reservationTime: new Date(parsed.data.reservationTime),
      tableId: parsed.data.tableId,
      notes: parsed.data.notes,
      createdByStaffId: staffId,
      status: 'confirmed',
    },
  });
  emitReservationEvent('reservation:new', reservation);
  res.json({ reservation });
});

const updateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show']).optional(),
  tableId: z.number().nullable().optional(),
  partySize: z.number().int().positive().optional(),
  reservationTime: z.string().min(1).optional(),
  notes: z.string().optional(),
});

adminReservationsRouter.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const id = Number(req.params.id);

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.tableId !== undefined ? { tableId: parsed.data.tableId } : {}),
      ...(parsed.data.partySize ? { partySize: parsed.data.partySize } : {}),
      ...(parsed.data.reservationTime ? { reservationTime: new Date(parsed.data.reservationTime) } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
  });

  // Seating occupies the table; completing/cancelling/no-show frees it back up.
  const tableId = reservation.tableId ?? existing.tableId;
  if (tableId) {
    if (reservation.status === 'seated') {
      await prisma.restaurantTable.update({ where: { id: tableId }, data: { status: 'occupied' } });
    } else if (['completed', 'cancelled', 'no_show'].includes(reservation.status)) {
      await prisma.restaurantTable.update({ where: { id: tableId }, data: { status: 'available' } });
    } else if (reservation.status === 'confirmed') {
      await prisma.restaurantTable.update({ where: { id: tableId }, data: { status: 'reserved' } });
    }
  }

  emitReservationEvent('reservation:updated', reservation);
  res.json({ reservation });
});

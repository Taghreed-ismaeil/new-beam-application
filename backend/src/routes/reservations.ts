import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireUser, requireStaff } from '../middleware/auth';
import { emitReservationEvent, emitTableEvent } from '../lib/socket';

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

const RESERVATION_INCLUDE = {
  user: { select: { id: true, name: true, phone: true, createdAt: true } },
  table: true,
} as const;

const OPEN_STATUSES = ['pending', 'confirmed', 'seated'];

// The admin booking flow — "what's the one legal next step from here" per current status.
function nextStatusesFor(status: string): string[] {
  switch (status) {
    case 'pending':
      return ['confirmed', 'rejected'];
    case 'confirmed':
      return ['seated', 'cancelled', 'no_show'];
    case 'seated':
      return ['completed'];
    default:
      return [];
  }
}

function toAdminReservation(r: any) {
  return {
    id: r.id,
    name: r.guestName ?? r.user?.name ?? '',
    phone: r.guestPhone ?? r.user?.phone ?? null,
    people: r.partySize,
    at: r.reservationTime,
    note: r.notes,
    reason: r.reason,
    status: r.status,
    tableNumber: r.table?.tableNumber ?? null,
    table: r.table ? { number: r.table.tableNumber, seats: r.table.seats } : null,
    nextStatuses: nextStatusesFor(r.status),
  };
}

adminReservationsRouter.get('/', async (req, res) => {
  const status = req.query.status as string | undefined;
  const date = req.query.date as string | undefined; // YYYY-MM-DD

  let dateFilter = {};
  if (date) {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);
    dateFilter = { reservationTime: { gte: start, lte: end } };
  }

  const statusFilter =
    !status || status === 'all' ? {} : status === 'open' ? { status: { in: OPEN_STATUSES as any } } : { status: status as any };

  const where = { ...statusFilter, ...dateFilter };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [reservations, total, byStatus, todayRows] = await Promise.all([
    prisma.reservation.findMany({ where, include: RESERVATION_INCLUDE, orderBy: { reservationTime: 'asc' }, take: 200 }),
    prisma.reservation.count({ where }),
    prisma.reservation.groupBy({ by: ['status'], _count: true }),
    prisma.reservation.findMany({
      where: { reservationTime: { gte: todayStart, lte: todayEnd } },
      select: { partySize: true },
    }),
  ]);

  const counts: Record<string, number> = { all: 0, open: 0 };
  for (const row of byStatus) {
    counts[row.status] = row._count;
    counts.all += row._count;
    if (OPEN_STATUSES.includes(row.status)) counts.open += row._count;
  }

  res.json({
    reservations: reservations.map(toAdminReservation),
    total,
    counts,
    today: { total: todayRows.length, people: todayRows.reduce((sum, r) => sum + r.partySize, 0) },
  });
});

const bookingSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  people: z.number().int().optional(),
  at: z.string().optional(),
  note: z.string().optional(),
});

adminReservationsRouter.post('/', async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  if (!parsed.data.name?.trim()) return res.status(400).json({ error: 'name_required' });
  if (!parsed.data.people || parsed.data.people <= 0) return res.status(400).json({ error: 'people_required' });
  if (!parsed.data.at) return res.status(400).json({ error: 'time_required' });

  const staffId = (req.auth as any).staffId;
  const reservation = await prisma.reservation.create({
    data: {
      guestName: parsed.data.name.trim(),
      guestPhone: parsed.data.phone,
      partySize: parsed.data.people,
      reservationTime: new Date(parsed.data.at),
      notes: parsed.data.note,
      createdByStaffId: staffId,
      status: 'confirmed',
    },
    include: RESERVATION_INCLUDE,
  });
  emitReservationEvent('reservation:new', reservation);
  res.json({ reservation: toAdminReservation(reservation) });
});

const updateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show', 'rejected']).optional(),
  tableNumber: z.string().nullable().optional(),
  people: z.number().int().positive().optional(),
  at: z.string().optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
});

adminReservationsRouter.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const id = Number(req.params.id);
  const d = parsed.data;

  const existing = await prisma.reservation.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'not_found' });

  if (d.status === 'rejected' && !d.reason?.trim()) {
    return res.status(400).json({ error: 'reason_required' });
  }

  let tableId: number | null | undefined;
  if (d.tableNumber !== undefined) {
    if (d.tableNumber === null) {
      tableId = null;
    } else {
      const table = await prisma.restaurantTable.findUnique({ where: { tableNumber: d.tableNumber } });
      if (!table) return res.status(400).json({ error: 'table_required' });
      tableId = table.id;
    }
  }

  const reservation = await prisma.reservation.update({
    where: { id },
    data: {
      ...(d.status ? { status: d.status } : {}),
      ...(tableId !== undefined ? { tableId } : {}),
      ...(d.people ? { partySize: d.people } : {}),
      ...(d.at ? { reservationTime: new Date(d.at) } : {}),
      ...(d.note !== undefined ? { notes: d.note } : {}),
      ...(d.reason !== undefined ? { reason: d.reason } : {}),
    },
    include: RESERVATION_INCLUDE,
  });

  // Seating occupies the table; wrapping up (however it ends) frees it back up.
  const activeTableId = reservation.tableId;
  if (activeTableId) {
    let table = null;
    if (reservation.status === 'seated') {
      table = await prisma.restaurantTable.update({ where: { id: activeTableId }, data: { status: 'occupied' } });
    } else if (['completed', 'cancelled', 'no_show', 'rejected'].includes(reservation.status)) {
      table = await prisma.restaurantTable.update({ where: { id: activeTableId }, data: { status: 'available' } });
    } else if (reservation.status === 'confirmed') {
      table = await prisma.restaurantTable.update({ where: { id: activeTableId }, data: { status: 'reserved' } });
    }
    if (table) emitTableEvent('table:updated', table);
  }

  emitReservationEvent('reservation:updated', reservation);
  res.json({ reservation: toAdminReservation(reservation) });
});

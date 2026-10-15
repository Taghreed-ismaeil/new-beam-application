import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';

// Analytics for the admin home screen (app/admin/index.jsx). Sales = paid, non-cancelled orders.
export const adminDashboardRouter = Router();

const DASHBOARD_ROLES = ['admin', 'manager', 'chef', 'cashier'] as const;
const REPORT_ROLES = ['admin', 'manager'] as const;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
// an open order older than this shows up as "late" on the dashboard
const LATE_AFTER_MIN = 30;
const VERY_LATE_AFTER_MIN = 45;

const round = (n: number) => Math.round(n * 100) / 100;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const paidWhere = (gte: Date, lte: Date): Prisma.OrderWhereInput => ({
  createdAt: { gte, lte },
  paymentStatus: 'paid',
  status: { not: 'cancelled' },
});

async function paidTotal(from: Date, to: Date) {
  const agg = await prisma.order.aggregate({ where: paidWhere(from, to), _sum: { total: true }, _count: true });
  return { total: Number(agg._sum.total ?? 0), count: agg._count };
}

adminDashboardRouter.get('/summary', requireStaff(...DASHBOARD_ROLES), async (_req, res) => {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - DAY_MS);
  // compare against yesterday up to the same time of day, so the morning isn't always "down"
  const yesterdaySameTime = new Date(now.getTime() - DAY_MS);

  const [todaySales, prevSales, byStatusRows, reservations] = await Promise.all([
    paidTotal(today, now),
    paidTotal(yesterday, yesterdaySameTime),
    prisma.order.groupBy({ by: ['status'], where: { createdAt: { gte: today } }, _count: true }),
    prisma.reservation.count({
      where: {
        reservationTime: { gte: today, lt: new Date(today.getTime() + DAY_MS) },
        status: { notIn: ['cancelled', 'rejected', 'no_show'] },
      },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const r of byStatusRows) byStatus[r.status] = r._count;

  res.json({
    sales: round(todaySales.total),
    salesChangePct: prevSales.total > 0 ? Math.round(((todaySales.total - prevSales.total) / prevSales.total) * 100) : null,
    ordersCount: todaySales.count,
    averageOrder: todaySales.count ? round(todaySales.total / todaySales.count) : 0,
    byStatus,
    reservations: { total: reservations },
  });
});

adminDashboardRouter.get('/alerts', requireStaff(...DASHBOARD_ROLES), async (_req, res) => {
  const now = Date.now();
  const [late, stock] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { in: ['pending', 'accepted', 'preparing', 'ready'] },
        createdAt: { lte: new Date(now - LATE_AFTER_MIN * 60_000) },
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
    }),
    // quantity <= minQuantity compares two columns, which Prisma can't express in a where clause
    prisma.$queryRaw<{ id: number; name: string; nameEn: string | null; unit: string; qty: number; min: number }[]>`
      SELECT id, name, "nameEn", unit, "quantityOnHand"::float AS qty, "minQuantity"::float AS min
      FROM "InventoryItem"
      WHERE "quantityOnHand" <= "minQuantity"
      ORDER BY "quantityOnHand" ASC
      LIMIT 10`,
  ]);

  const alerts = [
    ...late.map((o) => {
      const minutes = Math.floor((now - o.createdAt.getTime()) / 60_000);
      return {
        id: `order-${o.id}`,
        kind: 'order_late',
        severity: minutes >= VERY_LATE_AFTER_MIN ? 'high' : 'medium',
        orderId: o.id,
        minutes,
      };
    }),
    ...stock.map((i) => ({
      id: `stock-${i.id}`,
      kind: i.qty <= 0 ? 'stock_out' : 'stock_low',
      severity: i.qty <= 0 ? 'high' : 'medium',
      name: i.name,
      nameEn: i.nameEn,
      quantity: round(i.qty),
      unit: i.unit,
    })),
  ];
  res.json({ alerts });
});

type Range = 'day' | 'week' | 'month';
const parseRange = (r: unknown): Range => (r === 'day' || r === 'month' ? r : 'week');

/** Bucket boundaries for a chart range: hours of today, or the last 7 / 30 days. */
function buckets(range: Range, now = new Date()) {
  if (range === 'day') {
    const start = startOfDay(now);
    const hours = now.getHours() + 1;
    return Array.from({ length: hours }, (_, h) => new Date(start.getTime() + h * HOUR_MS)).map((from) => ({
      from,
      to: new Date(from.getTime() + HOUR_MS),
    }));
  }
  const days = range === 'week' ? 7 : 30;
  const first = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  return Array.from({ length: days }, (_, i) => {
    const from = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    return { from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1) };
  });
}

adminDashboardRouter.get('/sales', requireStaff(...DASHBOARD_ROLES), async (req, res) => {
  const range = parseRange(req.query.range);
  const b = buckets(range);
  const orders = await prisma.order.findMany({
    where: paidWhere(b[0].from, new Date()),
    select: { total: true, createdAt: true },
  });

  const points = b.map(({ from, to }) => ({
    date: from.toISOString(),
    value: round(orders.filter((o) => o.createdAt >= from && o.createdAt < to).reduce((s, o) => s + Number(o.total), 0)),
  }));
  res.json({ total: round(points.reduce((s, p) => s + p.value, 0)), points });
});

adminDashboardRouter.get('/top-items', requireStaff(...REPORT_ROLES), async (req, res) => {
  const range = parseRange(req.query.range);
  const from = buckets(range)[0].from;

  const lines = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: from }, status: { not: 'cancelled' } } },
    select: { menuItemId: true, nameSnapshot: true, nameEnSnapshot: true, quantity: true, unitPriceSnapshot: true },
  });

  const byItem = new Map<number, { menuItemId: number; name: string; nameEn: string | null; quantity: number; revenue: number }>();
  for (const l of lines) {
    const row = byItem.get(l.menuItemId) ?? {
      menuItemId: l.menuItemId,
      name: l.nameSnapshot,
      nameEn: l.nameEnSnapshot,
      quantity: 0,
      revenue: 0,
    };
    row.quantity += l.quantity;
    row.revenue += l.quantity * Number(l.unitPriceSnapshot);
    byItem.set(l.menuItemId, row);
  }

  const items = [...byItem.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5)
    .map((r) => ({ ...r, revenue: round(r.revenue) }));
  res.json({ items });
});

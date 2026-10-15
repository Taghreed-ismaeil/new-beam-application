import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';

// Profit & loss for the admin panel's Expenses → Report tab (app/admin/expenses.jsx).
// Read-only: derived from paid, non-cancelled orders and recorded expenses.
export const adminReportsRouter = Router();
adminReportsRouter.use(requireStaff('admin', 'manager'));

const DAY_MS = 86_400_000;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `from`/`to` are YYYY-MM-DD (inclusive), same convention as GET /api/admin/expenses.
 * With neither given the report covers the current calendar month so far. */
function resolveRange(from?: string, to?: string): { start: Date; end: Date } | null {
  const valid = (s?: string) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!valid(from) || !valid(to)) return null;

  const now = new Date();
  const start = from ? new Date(`${from}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = to ? new Date(`${to}T23:59:59.999`) : now;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null;
  // a year of daily rows is plenty — keeps a typo'd range from building a huge series
  if (end.getTime() - start.getTime() > 366 * DAY_MS) return null;
  return { start, end };
}

async function buildReport(start: Date, end: Date) {
  const [orders, expenses] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, paymentStatus: 'paid', status: { not: 'cancelled' } },
      select: { total: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: start, lte: end } },
      select: { amount: true, category: true, expenseDate: true },
    }),
  ]);

  const days = new Map<string, { sales: number; expenses: number }>();
  for (let t = new Date(start.getFullYear(), start.getMonth(), start.getDate()); t <= end; t = new Date(t.getTime() + DAY_MS)) {
    days.set(dayKey(t), { sales: 0, expenses: 0 });
  }

  let sales = 0;
  for (const o of orders) {
    const amount = Number(o.total);
    sales += amount;
    const day = days.get(dayKey(o.createdAt));
    if (day) day.sales += amount;
  }

  let expenseTotal = 0;
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    const amount = Number(e.amount);
    expenseTotal += amount;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + amount;
    const day = days.get(dayKey(e.expenseDate));
    if (day) day.expenses += amount;
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  const series = [...days.entries()]
    .map(([date, d]) => ({ date, sales: round(d.sales), expenses: round(d.expenses), profit: round(d.sales - d.expenses) }))
    .reverse(); // newest day first, matching the expenses list

  return {
    from: dayKey(start),
    to: dayKey(end),
    sales: round(sales),
    expenses: round(expenseTotal),
    profit: round(sales - expenseTotal),
    ordersCount: orders.length,
    byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, round(v)])),
    series,
  };
}

adminReportsRouter.get('/profit-loss', async (req, res) => {
  const range = resolveRange(req.query.from as string | undefined, req.query.to as string | undefined);
  if (!range) return res.status(400).json({ error: 'invalid_range' });
  res.json(await buildReport(range.start, range.end));
});

adminReportsRouter.get('/profit-loss/export.csv', async (req, res) => {
  const range = resolveRange(req.query.from as string | undefined, req.query.to as string | undefined);
  if (!range) return res.status(400).json({ error: 'invalid_range' });
  const report = await buildReport(range.start, range.end);

  const rows = [
    ['date', 'sales', 'expenses', 'profit'],
    ...report.series.map((d) => [d.date, d.sales.toFixed(2), d.expenses.toFixed(2), d.profit.toFixed(2)]),
    ['total', report.sales.toFixed(2), report.expenses.toFixed(2), report.profit.toFixed(2)],
  ];
  const csv = rows.map((r) => r.join(',')).join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="profit-loss_${report.from}_${report.to}.csv"`);
  // BOM so Excel opens the file as UTF-8
  res.send(`﻿${csv}`);
});

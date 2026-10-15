import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';

// Customer directory for app/admin/customers.jsx. Cashiers and waiters can look customers up
// (read-only, same as the app's permission table); only admins/managers can block.
export const adminCustomersRouter = Router();

const round = (n: number) => Math.round(n * 100) / 100;

adminCustomersRouter.get('/', requireStaff('admin', 'manager', 'cashier', 'waiter'), async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const where: Prisma.UserWhereInput = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { orders: true, vouchers: true } } },
    }),
  ]);

  const ids = users.map((u) => u.id);
  const [spent, completed] = await Promise.all([
    prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, paymentStatus: 'paid', status: { not: 'cancelled' } },
      _sum: { total: true },
    }),
    // every finished collect-and-win card issues one loyalty voucher (wheel prizes are separate)
    prisma.voucher.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, source: 'loyalty' },
      _count: true,
    }),
  ]);
  const spentBy = new Map(spent.map((s) => [s.userId, Number(s._sum.total ?? 0)]));
  const collectedBy = new Map(completed.map((c) => [c.userId, c._count]));

  res.json({
    customers: users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      createdAt: u.createdAt,
      isBlocked: !!u.blockedAt,
      blockedReason: u.blockedReason,
      ordersCount: u._count.orders,
      totalSpent: round(spentBy.get(u.id) ?? 0),
      collectionsCompleted: collectedBy.get(u.id) ?? 0,
      vouchersEarned: u._count.vouchers,
    })),
    total,
    page,
  });
});

adminCustomersRouter.get('/:id', requireStaff('admin', 'manager', 'cashier', 'waiter'), async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: 'not_found' });

  const [progress, vouchers, orders] = await Promise.all([
    prisma.loyaltyProgress.findMany({ where: { userId: id }, include: { menuItem: true }, orderBy: { id: 'asc' } }),
    prisma.voucher.findMany({ where: { userId: id }, include: { menuItem: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  res.json({
    customer: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt,
      isBlocked: !!user.blockedAt,
      blockedAt: user.blockedAt,
      blockedReason: user.blockedReason,
    },
    loyalty: progress
      .filter((p) => Array.isArray(p.menuItem.layers))
      .map((p) => ({
        id: p.id,
        name: p.menuItem.name,
        nameEn: p.menuItem.nameEn,
        revealedCount: p.revealedCount,
        requiredPieces: (p.menuItem.layers as unknown[]).length || 1,
        completed: !!p.completedAt,
      })),
    vouchers: vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      reward: v.label ?? v.menuItem?.rewardValue ?? v.menuItem?.name ?? '—',
      state: v.redeemedAt ? 'redeemed' : 'valid',
      createdAt: v.createdAt,
      redeemedAt: v.redeemedAt,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      source: o.orderType === 'counter' ? 'counter' : 'app',
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
    })),
  });
});

const blockSchema = z.object({ blocked: z.boolean(), reason: z.string().max(500).optional() });

adminCustomersRouter.patch('/:id/block', requireStaff('admin', 'manager'), async (req, res) => {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const id = Number(req.params.id);
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: 'not_found' });

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data.blocked
      ? { blockedAt: new Date(), blockedReason: parsed.data.reason?.trim() || null }
      : { blockedAt: null, blockedReason: null },
  });
  res.json({
    customer: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      createdAt: user.createdAt,
      isBlocked: !!user.blockedAt,
      blockedAt: user.blockedAt,
      blockedReason: user.blockedReason,
    },
  });
});

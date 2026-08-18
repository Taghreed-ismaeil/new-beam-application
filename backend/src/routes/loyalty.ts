import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireUser, requireStaff } from '../middleware/auth';
import { env } from '../config/env';
import { versionedUrl } from '../lib/images';

function genVoucherCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function logScan(userId: number | null, menuItemId: number | null, accepted: boolean, reason: string | null) {
  await prisma.scanLog.create({ data: { userId, menuItemId, accepted, reason } });
}

// ---------- Customer ----------
export const loyaltyRouter = Router();
loyaltyRouter.use(requireUser);

loyaltyRouter.get('/progress', async (req, res) => {
  const userId = (req.auth as any).userId;
  const items = await prisma.menuItem.findMany({
    where: { OR: [{ qrToken: { not: null } }, { qrGroupToken: { not: null } }] },
    orderBy: { id: 'asc' },
  });

  const withProgress = await Promise.all(
    items.map(async (item) => {
      const layers = item.layers as any[];
      const progress = await prisma.loyaltyProgress.findUnique({
        where: { userId_menuItemId: { userId, menuItemId: item.id } },
      });
      return { item, layers, revealedCount: progress?.revealedCount ?? 0, completed: !!progress?.completedAt };
    }),
  );

  function toCard(w: (typeof withProgress)[number], nameOverride?: { name: string; nameEn: string }) {
    return {
      id: w.item.id,
      name: nameOverride?.name ?? w.item.name,
      nameEn: nameOverride?.nameEn ?? w.item.nameEn,
      grayImage: versionedUrl(w.item.grayImage, w.item.updatedAt),
      updatedAt: w.item.updatedAt.getTime(),
      layers: w.layers,
      total: w.layers.length,
      revealedCount: w.revealedCount,
      completed: w.completed,
      rewardType: w.item.rewardType,
      rewardValue: w.item.rewardValue,
    };
  }

  // Items that share a QR (e.g. "which sandwich did you buy?") show as one combined
  // "Sandwiches" card instead of cluttering the list with every option separately.
  const individual = withProgress.filter((w) => !w.item.qrGroupToken);
  const grouped = withProgress.filter((w) => w.item.qrGroupToken);

  const groupsByToken = new Map<string, typeof withProgress>();
  for (const w of grouped) {
    const key = w.item.qrGroupToken as string;
    if (!groupsByToken.has(key)) groupsByToken.set(key, []);
    groupsByToken.get(key)!.push(w);
  }

  const result = [
    ...individual.map((w) => toCard(w)),
    ...Array.from(groupsByToken.values()).map((groupItems) => {
      const active = groupItems.find((w) => w.revealedCount > 0) ?? groupItems[0];
      return toCard(active, { name: 'سندويشات', nameEn: 'Sandwiches' });
    }),
  ];
  res.json({ progress: result });
});

const scanSchema = z.object({
  token: z.string().min(1).optional(),
  selectedItemId: z.number().optional(),
});

loyaltyRouter.post('/scan', async (req, res) => {
  const userId = (req.auth as any).userId;
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  let item;
  if (parsed.data.selectedItemId) {
    // Follow-up call after the customer picked one option from a shared-QR group.
    item = await prisma.menuItem.findUnique({ where: { id: parsed.data.selectedItemId } });
    if (!item || !item.qrGroupToken) {
      await logScan(userId, null, false, 'invalid_qr');
      return res.status(404).json({ accepted: false, reason: 'invalid_qr', message: 'Invalid item' });
    }
  } else if (parsed.data.token) {
    item = await prisma.menuItem.findUnique({ where: { qrToken: parsed.data.token } });
    if (!item) {
      // Not an individual QR — maybe it's a QR shared by a group of items (e.g. "pick your sandwich type").
      const groupOptions = await prisma.menuItem.findMany({ where: { qrGroupToken: parsed.data.token } });
      if (groupOptions.length > 0) {
        return res.json({
          needsSelection: true,
          options: groupOptions.map((o) => ({
            id: o.id,
            name: o.name,
            nameEn: o.nameEn,
            grayImage: versionedUrl(o.grayImage, o.updatedAt),
          })),
        });
      }
      await logScan(userId, null, false, 'invalid_qr');
      return res.status(404).json({ accepted: false, reason: 'invalid_qr', message: "This QR doesn't belong to the restaurant" });
    }
  } else {
    return res.status(400).json({ error: 'invalid_input' });
  }

  if (!item.layers) {
    await logScan(userId, item.id, false, 'invalid_qr');
    return res.status(404).json({ accepted: false, reason: 'invalid_qr', message: "This item isn't enrolled in the loyalty program yet" });
  }

  const layers = item.layers as any[];
  const total = layers.length;

  let progress = await prisma.loyaltyProgress.findUnique({
    where: { userId_menuItemId: { userId, menuItemId: item.id } },
  });
  if (!progress) {
    progress = await prisma.loyaltyProgress.create({ data: { userId, menuItemId: item.id } });
  }

  if (progress.completedAt) {
    const voucher = await prisma.voucher.findFirst({
      where: { userId, menuItemId: item.id, redeemedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    await logScan(userId, item.id, false, 'already_completed');
    return res.json({
      accepted: false,
      reason: 'already_completed',
      message: 'You already finished this set — redeem your voucher before starting a new one',
      voucher,
    });
  }

  // Credits are per unit purchased (buying 5 burgers in one order = 5 allowed scans), not per order row.
  const earnedAgg = await prisma.orderItem.aggregate({
    where: { menuItemId: item.id, order: { userId, status: 'completed' } },
    _sum: { quantity: true },
  });
  const earned = earnedAgg._sum.quantity ?? 0;

  // consumedCount is all-time and never resets (unlike revealedCount, which resets on redemption
  // for display purposes) — this is what actually stops a redeemed customer from scanning for free.
  if (progress.consumedCount >= earned && !env.loyaltySkipPurchaseCheck) {
    await logScan(userId, item.id, false, 'no_credit');
    return res.json({
      accepted: false,
      reason: 'no_credit',
      message: `You need to order ${item.nameEn ?? item.name} through the app or cashier first before scanning its QR`,
    });
  }

  const newRevealed = progress.revealedCount + 1;
  const completedNow = newRevealed >= total;

  await prisma.loyaltyProgress.update({
    where: { id: progress.id },
    data: {
      revealedCount: newRevealed,
      consumedCount: progress.consumedCount + 1,
      completedAt: completedNow ? new Date() : null,
    },
  });

  let voucher = null;
  if (completedNow) {
    voucher = await prisma.voucher.create({
      data: { code: genVoucherCode(), userId, menuItemId: item.id },
    });
  }

  await logScan(userId, item.id, true, null);

  res.json({
    accepted: true,
    item: {
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      grayImage: versionedUrl(item.grayImage, item.updatedAt),
      updatedAt: item.updatedAt.getTime(),
      layers,
      rewardValue: item.rewardValue,
    },
    revealedCount: newRevealed,
    total,
    completed: completedNow,
    voucher,
  });
});

loyaltyRouter.get('/vouchers', async (req, res) => {
  const userId = (req.auth as any).userId;
  const vouchers = await prisma.voucher.findMany({
    where: { userId },
    include: { menuItem: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ vouchers });
});

// ---------- Staff ----------
export const adminLoyaltyRouter = Router();

const redeemSchema = z.object({ code: z.string().min(1) });

adminLoyaltyRouter.post('/redeem', requireStaff('admin', 'cashier'), async (req, res) => {
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const voucher = await prisma.voucher.findUnique({ where: { code: parsed.data.code } });
  if (!voucher) return res.status(404).json({ error: 'كود غير موجود' });
  if (voucher.redeemedAt) return res.status(400).json({ error: 'الكود مستخدم مسبقاً' });

  await prisma.voucher.update({ where: { id: voucher.id }, data: { redeemedAt: new Date() } });
  await prisma.loyaltyProgress.update({
    where: { userId_menuItemId: { userId: voucher.userId, menuItemId: voucher.menuItemId } },
    data: { revealedCount: 0, completedAt: null },
  });

  const [user, item] = await Promise.all([
    prisma.user.findUnique({
      where: { id: voucher.userId },
      select: { id: true, name: true, phone: true, createdAt: true },
    }),
    prisma.menuItem.findUnique({ where: { id: voucher.menuItemId } }),
  ]);
  res.json({ ok: true, user, item });
});

adminLoyaltyRouter.get('/scanlogs', requireStaff('admin'), async (_req, res) => {
  const logs = await prisma.scanLog.findMany({
    include: { user: { select: { id: true, name: true, phone: true, createdAt: true } }, menuItem: true },
    orderBy: { scannedAt: 'desc' },
    take: 200,
  });
  res.json({ logs });
});

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireUser, requireStaff } from '../middleware/auth';
import { env } from '../config/env';
import { versionedUrl } from '../lib/images';

function genVoucherCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Wheel of Fortune — the spin itself happens here, not on the client, so a
// customer can't just pick their own prize by calling the endpoint with a
// crafted body. Keep weight/prize/key in sync with SEGMENTS in
// app/loyalty/wheel.jsx; `label` is what shows up on the customer's real
// voucher (My Rewards), so it doesn't need to match the on-wheel text exactly.
const WHEEL_SEGMENTS = [
  { key: 'again1', weight: 3, prize: false, label: null },
  { key: 'off5', weight: 2, prize: true, label: '5% OFF' },
  { key: 'drink', weight: 2, prize: true, label: 'Free Drink' },
  { key: 'off10', weight: 2, prize: true, label: '10% OFF' },
  { key: 'again2', weight: 2, prize: false, label: null },
  { key: 'side', weight: 1.4, prize: true, label: 'Free Fries' },
  { key: 'off15', weight: 1, prize: true, label: '15% OFF' },
  { key: 'meal', weight: 0.8, prize: true, label: 'Free Meal' },
  { key: 'grand', weight: 0.3, prize: true, label: 'Grand Prize' },
] as const;

function pickWheelSegment() {
  const total = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    r -= WHEEL_SEGMENTS[i].weight;
    if (r <= 0) return { index: i, segment: WHEEL_SEGMENTS[i] };
  }
  return { index: WHEEL_SEGMENTS.length - 1, segment: WHEEL_SEGMENTS[WHEEL_SEGMENTS.length - 1] };
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

// A "rarity" sticker (e.g. BURGER_QR_RARE) is still printed on exactly one physical
// meal — it represents one purchased unit, just a luckier one. It resolves to the
// item's real qrToken/qrGroupToken plus how many pieces that one scan is worth.
// Keep this in sync with RARITY_TOKEN_LOOKUP in app/loyalty/scan.jsx.
const RARITY_TOKEN_MAP: Record<string, { realToken: string; reveals: number }> = {
  PIZZA_QR_NORMAL: { realToken: 'MENU_f12908d6', reveals: 1 },
  PIZZA_QR_RARE: { realToken: 'MENU_f12908d6', reveals: 2 },
  PIZZA_QR_SUPER: { realToken: 'MENU_f12908d6', reveals: 3 },
  SHAWARMA_QR_NORMAL: { realToken: 'MENU_d3051fc2', reveals: 1 },
  SHAWARMA_QR_RARE: { realToken: 'MENU_d3051fc2', reveals: 2 },
  SHAWARMA_QR_SUPER: { realToken: 'MENU_d3051fc2', reveals: 3 },
  BURGER_QR_NORMAL: { realToken: 'MENU_72952981', reveals: 1 },
  BURGER_QR_RARE: { realToken: 'MENU_72952981', reveals: 2 },
  BURGER_QR_SUPER: { realToken: 'MENU_72952981', reveals: 3 },
  SANDWICH_QR_NORMAL: { realToken: 'SANDWICH_GROUP_e40422b2', reveals: 1 },
  SANDWICH_QR_RARE: { realToken: 'SANDWICH_GROUP_e40422b2', reveals: 2 },
  SANDWICH_QR_SUPER: { realToken: 'SANDWICH_GROUP_e40422b2', reveals: 3 },

  // Gifts promo salads — not on the real menu yet (requiresPurchase: false on these items), so
  // reveals are 1/3/5 instead of the usual 1/2/3. Generated by prisma/seed-gifts-salads.ts.
  GREEK_SALAD_QR_NORMAL: { realToken: 'MENU_2052e487', reveals: 1 },
  GREEK_SALAD_QR_RARE: { realToken: 'MENU_2052e487', reveals: 3 },
  GREEK_SALAD_QR_SUPER: { realToken: 'MENU_2052e487', reveals: 5 },
  ARUGULA_SALAD_QR_NORMAL: { realToken: 'MENU_eb8d00b5', reveals: 1 },
  ARUGULA_SALAD_QR_RARE: { realToken: 'MENU_eb8d00b5', reveals: 3 },
  ARUGULA_SALAD_QR_SUPER: { realToken: 'MENU_eb8d00b5', reveals: 5 },
  CAESAR_SALAD_QR_NORMAL: { realToken: 'MENU_51f7bf83', reveals: 1 },
  CAESAR_SALAD_QR_RARE: { realToken: 'MENU_51f7bf83', reveals: 3 },
  CAESAR_SALAD_QR_SUPER: { realToken: 'MENU_51f7bf83', reveals: 5 },
  SHAWARMA_SALAD_QR_NORMAL: { realToken: 'MENU_8fa440f9', reveals: 1 },
  SHAWARMA_SALAD_QR_RARE: { realToken: 'MENU_8fa440f9', reveals: 3 },
  SHAWARMA_SALAD_QR_SUPER: { realToken: 'MENU_8fa440f9', reveals: 5 },
  FATTOUSH_QR_NORMAL: { realToken: 'MENU_bb9565d3', reveals: 1 },
  FATTOUSH_QR_RARE: { realToken: 'MENU_bb9565d3', reveals: 3 },
  FATTOUSH_QR_SUPER: { realToken: 'MENU_bb9565d3', reveals: 5 },
  QUINOA_SALAD_QR_NORMAL: { realToken: 'MENU_269d8f1b', reveals: 1 },
  QUINOA_SALAD_QR_RARE: { realToken: 'MENU_269d8f1b', reveals: 3 },
  QUINOA_SALAD_QR_SUPER: { realToken: 'MENU_269d8f1b', reveals: 5 },
};

loyaltyRouter.post('/scan', async (req, res) => {
  const userId = (req.auth as any).userId;
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const rarity = parsed.data.token ? RARITY_TOKEN_MAP[parsed.data.token] : undefined;
  const reveals = rarity?.reveals ?? 1;
  const lookupToken = rarity?.realToken ?? parsed.data.token;

  let item;
  if (parsed.data.selectedItemId) {
    // Follow-up call after the customer picked one option from a shared-QR group.
    item = await prisma.menuItem.findUnique({ where: { id: parsed.data.selectedItemId } });
    if (!item || !item.qrGroupToken) {
      await logScan(userId, null, false, 'invalid_qr');
      return res.status(404).json({ accepted: false, reason: 'invalid_qr', message: 'Invalid item' });
    }
  } else if (lookupToken) {
    item = await prisma.menuItem.findUnique({ where: { qrToken: lookupToken } });
    if (!item) {
      // Not an individual QR — maybe it's a QR shared by a group of items (e.g. "pick your sandwich type").
      const groupOptions = await prisma.menuItem.findMany({ where: { qrGroupToken: lookupToken } });
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
  // One scan always costs exactly one credit no matter its rarity tier — the tier changes how many
  // pieces that single scan reveals, not how many purchases it costs.
  if (item.requiresPurchase && progress.consumedCount >= earned && !env.loyaltySkipPurchaseCheck) {
    await logScan(userId, item.id, false, 'no_credit');
    return res.json({
      accepted: false,
      reason: 'no_credit',
      message: `You need to order ${item.nameEn ?? item.name} through the app or cashier first before scanning its QR`,
    });
  }

  const newRevealed = Math.min(progress.revealedCount + reveals, total);
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

loyaltyRouter.post('/wheel/spin', async (req, res) => {
  const userId = (req.auth as any).userId;
  const { index, segment } = pickWheelSegment();

  let voucher = null;
  if (segment.prize) {
    voucher = await prisma.voucher.create({
      data: { code: genVoucherCode(), userId, label: segment.label, source: 'wheel' },
    });
  }

  res.json({ index, key: segment.key, voucher });
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

  // Wheel-of-fortune vouchers aren't tied to a menu item or a collect-and-win
  // progress row — only loyalty vouchers need the collection reset.
  if (voucher.menuItemId) {
    await prisma.loyaltyProgress.update({
      where: { userId_menuItemId: { userId: voucher.userId, menuItemId: voucher.menuItemId } },
      data: { revealedCount: 0, completedAt: null },
    });
  }

  const [user, item] = await Promise.all([
    prisma.user.findUnique({
      where: { id: voucher.userId },
      select: { id: true, name: true, phone: true, createdAt: true },
    }),
    voucher.menuItemId ? prisma.menuItem.findUnique({ where: { id: voucher.menuItemId } }) : Promise.resolve(null),
  ]);
  res.json({ ok: true, user, item, label: voucher.label });
});

adminLoyaltyRouter.get('/scanlogs', requireStaff('admin'), async (_req, res) => {
  const logs = await prisma.scanLog.findMany({
    include: { user: { select: { id: true, name: true, phone: true, createdAt: true } }, menuItem: true },
    orderBy: { scannedAt: 'desc' },
    take: 200,
  });
  res.json({ logs });
});

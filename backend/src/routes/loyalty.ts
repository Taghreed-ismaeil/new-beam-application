import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireUser, requireStaff } from '../middleware/auth';
import { env } from '../config/env';
import { PUZZLE_PIECES, versionedUrl } from '../lib/images';

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

// The generic "BEEM_GIFT_QR" sticker — one QR standing in for the whole
// collect-and-win program instead of a specific item's printed code. No
// purchase check: the random pick (both which item and which tier) happens
// here so a customer can't choose their own prize by calling this directly.
// Weights are percentages: rare and super rare each land more often than a basic piece.
const GIFT_TIERS = [
  { tier: 'normal', reveals: 1, weight: 20 },
  { tier: 'rare', reveals: 3, weight: 45 },
  { tier: 'super', reveals: 5, weight: 35 },
] as const;

function pickGiftTier() {
  const total = GIFT_TIERS.reduce((sum, t) => sum + t.weight, 0);
  let r = Math.random() * total;
  for (const t of GIFT_TIERS) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return GIFT_TIERS[GIFT_TIERS.length - 1];
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
      total: PUZZLE_PIECES,
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

// TEMPORARY — testing phase: meal/sandwich QRs work without buying the item first.
// Set back to false before launch so each scan again needs one purchased unit.
const FREE_SCANS_FOR_TESTING = true;

const scanSchema = z.object({
  token: z.string().min(1).optional(),
  selectedItemId: z.number().optional(),
});

// Older printed "rarity" stickers (e.g. KABDA_QR_RARE) — each still stands for one
// purchased unit of that item and resolves to the item's real qrToken. The tier
// in the sticker name no longer decides anything: every scan rolls its tier with
// pickGiftTier() (`reveals` here is unused, kept so the table stays readable).
const RARITY_TOKEN_MAP: Record<string, { realToken: string; reveals: number }> = {
  KABDA_QR_NORMAL: { realToken: 'MENU_5b910645', reveals: 1 },
  KABDA_QR_RARE: { realToken: 'MENU_5b910645', reveals: 3 },
  KABDA_QR_SUPER: { realToken: 'MENU_5b910645', reveals: 5 },
  KABDA_CHEESE_QR_NORMAL: { realToken: 'MENU_cb53f74a', reveals: 1 },
  KABDA_CHEESE_QR_RARE: { realToken: 'MENU_cb53f74a', reveals: 3 },
  KABDA_CHEESE_QR_SUPER: { realToken: 'MENU_cb53f74a', reveals: 5 },
  KABDA_SPICY_QR_NORMAL: { realToken: 'MENU_812fc437', reveals: 1 },
  KABDA_SPICY_QR_RARE: { realToken: 'MENU_812fc437', reveals: 3 },
  KABDA_SPICY_QR_SUPER: { realToken: 'MENU_812fc437', reveals: 5 },
  CRISPY_CHICKEN_QR_NORMAL: { realToken: 'MENU_f1ba4c2d', reveals: 1 },
  CRISPY_CHICKEN_QR_RARE: { realToken: 'MENU_f1ba4c2d', reveals: 3 },
  CRISPY_CHICKEN_QR_SUPER: { realToken: 'MENU_f1ba4c2d', reveals: 5 },
  BEEM_BURGER_QR_NORMAL: { realToken: 'MENU_853261b7', reveals: 1 },
  BEEM_BURGER_QR_RARE: { realToken: 'MENU_853261b7', reveals: 3 },
  BEEM_BURGER_QR_SUPER: { realToken: 'MENU_853261b7', reveals: 5 },
  MEXICAN_BURGER_QR_NORMAL: { realToken: 'MENU_8fc8bfae', reveals: 1 },
  MEXICAN_BURGER_QR_RARE: { realToken: 'MENU_8fc8bfae', reveals: 3 },
  MEXICAN_BURGER_QR_SUPER: { realToken: 'MENU_8fc8bfae', reveals: 5 },
  SHAWARMA_CREAM_QR_NORMAL: { realToken: 'MENU_654c22d7', reveals: 1 },
  SHAWARMA_CREAM_QR_RARE: { realToken: 'MENU_654c22d7', reveals: 3 },
  SHAWARMA_CREAM_QR_SUPER: { realToken: 'MENU_654c22d7', reveals: 5 },
  SHAWARMA_BBQ_QR_NORMAL: { realToken: 'MENU_573543fd', reveals: 1 },
  SHAWARMA_BBQ_QR_RARE: { realToken: 'MENU_573543fd', reveals: 3 },
  SHAWARMA_BBQ_QR_SUPER: { realToken: 'MENU_573543fd', reveals: 5 },
  SEASON_BURGER_QR_NORMAL: { realToken: 'MENU_ed0920ce', reveals: 1 },
  SEASON_BURGER_QR_RARE: { realToken: 'MENU_ed0920ce', reveals: 3 },
  SEASON_BURGER_QR_SUPER: { realToken: 'MENU_ed0920ce', reveals: 5 },
  CLASSIC_BURGER_QR_NORMAL: { realToken: 'MENU_81c5b1b6', reveals: 1 },
  CLASSIC_BURGER_QR_RARE: { realToken: 'MENU_81c5b1b6', reveals: 3 },
  CLASSIC_BURGER_QR_SUPER: { realToken: 'MENU_81c5b1b6', reveals: 5 },
  HALLOUMI_QR_NORMAL: { realToken: 'MENU_f3d6a074', reveals: 1 },
  HALLOUMI_QR_RARE: { realToken: 'MENU_f3d6a074', reveals: 3 },
  HALLOUMI_QR_SUPER: { realToken: 'MENU_f3d6a074', reveals: 5 },
  MAFRAKEH_QR_NORMAL: { realToken: 'MENU_44cae0b6', reveals: 1 },
  MAFRAKEH_QR_RARE: { realToken: 'MENU_44cae0b6', reveals: 3 },
  MAFRAKEH_QR_SUPER: { realToken: 'MENU_44cae0b6', reveals: 5 },
  TENDER_QR_NORMAL: { realToken: 'MENU_ace08a48', reveals: 1 },
  TENDER_QR_RARE: { realToken: 'MENU_ace08a48', reveals: 3 },
  TENDER_QR_SUPER: { realToken: 'MENU_ace08a48', reveals: 5 },
  TURKEY_CHICKEN_QR_NORMAL: { realToken: 'MENU_a2a9f9cf', reveals: 1 },
  TURKEY_CHICKEN_QR_RARE: { realToken: 'MENU_a2a9f9cf', reveals: 3 },
  TURKEY_CHICKEN_QR_SUPER: { realToken: 'MENU_a2a9f9cf', reveals: 5 },
  FAHITA2_QR_NORMAL: { realToken: 'MENU_82e6dcf0', reveals: 1 },
  FAHITA2_QR_RARE: { realToken: 'MENU_82e6dcf0', reveals: 3 },
  FAHITA2_QR_SUPER: { realToken: 'MENU_82e6dcf0', reveals: 5 },
  FRIES_QR_NORMAL: { realToken: 'MENU_93ac2685', reveals: 1 },
  FRIES_QR_RARE: { realToken: 'MENU_93ac2685', reveals: 3 },
  FRIES_QR_SUPER: { realToken: 'MENU_93ac2685', reveals: 5 },
  ZAATAR_CHICKEN_QR_NORMAL: { realToken: 'MENU_373197b1', reveals: 1 },
  ZAATAR_CHICKEN_QR_RARE: { realToken: 'MENU_373197b1', reveals: 3 },
  ZAATAR_CHICKEN_QR_SUPER: { realToken: 'MENU_373197b1', reveals: 5 },
  SHAWARMA_BEEM_QR_NORMAL: { realToken: 'MENU_c5a6d88d', reveals: 1 },
  SHAWARMA_BEEM_QR_RARE: { realToken: 'MENU_c5a6d88d', reveals: 3 },
  SHAWARMA_BEEM_QR_SUPER: { realToken: 'MENU_c5a6d88d', reveals: 5 },
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
  POTATO_CUBES_QR_NORMAL: { realToken: 'MENU_a3449a1b', reveals: 1 },
  POTATO_CUBES_QR_RARE: { realToken: 'MENU_a3449a1b', reveals: 3 },
  POTATO_CUBES_QR_SUPER: { realToken: 'MENU_a3449a1b', reveals: 5 },
  FATTEH_SHAWARMA_RICE_QR_NORMAL: { realToken: 'MENU_1fe2e840', reveals: 1 },
  FATTEH_SHAWARMA_RICE_QR_RARE: { realToken: 'MENU_1fe2e840', reveals: 3 },
  FATTEH_SHAWARMA_RICE_QR_SUPER: { realToken: 'MENU_1fe2e840', reveals: 5 },
  FATTEH_SHAWARMA_QR_NORMAL: { realToken: 'MENU_46ae3411', reveals: 1 },
  FATTEH_SHAWARMA_QR_RARE: { realToken: 'MENU_46ae3411', reveals: 3 },
  FATTEH_SHAWARMA_QR_SUPER: { realToken: 'MENU_46ae3411', reveals: 5 },
  FATTEH_FALAFEL_QR_NORMAL: { realToken: 'MENU_dfdfa1fe', reveals: 1 },
  FATTEH_FALAFEL_QR_RARE: { realToken: 'MENU_dfdfa1fe', reveals: 3 },
  FATTEH_FALAFEL_QR_SUPER: { realToken: 'MENU_dfdfa1fe', reveals: 5 },
  MAC_CHEESE_QR_NORMAL: { realToken: 'MENU_c9d16a30', reveals: 1 },
  MAC_CHEESE_QR_RARE: { realToken: 'MENU_c9d16a30', reveals: 3 },
  MAC_CHEESE_QR_SUPER: { realToken: 'MENU_c9d16a30', reveals: 5 },
  MEXICAN2_QR_NORMAL: { realToken: 'MENU_13788f87', reveals: 1 },
  MEXICAN2_QR_RARE: { realToken: 'MENU_13788f87', reveals: 3 },
  MEXICAN2_QR_SUPER: { realToken: 'MENU_13788f87', reveals: 5 },
};

loyaltyRouter.post('/scan', async (req, res) => {
  const userId = (req.auth as any).userId;
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const rarity = parsed.data.token ? RARITY_TOKEN_MAP[parsed.data.token] : undefined;
  // The tier is rolled here on every meal/sandwich scan, with the same odds as the
  // Gifts QR (rare and super rare more likely than basic) — whichever sticker was
  // scanned (the item's own QR, a shared group QR or an old _NORMAL/_RARE/_SUPER
  // sticker), so a customer can't pick their luck by choosing a sticker.
  const { tier, reveals } = pickGiftTier();
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
  const total = PUZZLE_PIECES;

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
  if (!FREE_SCANS_FOR_TESTING && progress.consumedCount >= earned && !env.loyaltySkipPurchaseCheck) {
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
    tier,
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

// Lucky-wheel prize on the Gifts QR: after WHEEL_EVERY_SCANS gift pieces in a
// row, the next scan (the 11th) wins a wheel spin instead — every time, no
// randomness. The streak is counted from the scan log (gift_qr rows since this
// user's last gift_wheel row), so no schema change.
const WHEEL_EVERY_SCANS = 10;

async function rollGiftWheel(userId: number) {
  const lastWheel = await prisma.scanLog.findFirst({
    where: { userId, reason: 'gift_wheel' },
    orderBy: { scannedAt: 'desc' },
    select: { scannedAt: true },
  });
  const streak = await prisma.scanLog.count({
    where: {
      userId,
      reason: 'gift_qr',
      accepted: true,
      ...(lastWheel ? { scannedAt: { gt: lastWheel.scannedAt } } : {}),
    },
  });
  return streak >= WHEEL_EVERY_SCANS;
}

loyaltyRouter.post('/gift-scan', async (req, res) => {
  const userId = (req.auth as any).userId;

  if (await rollGiftWheel(userId)) {
    await logScan(userId, null, true, 'gift_wheel');
    return res.json({ accepted: true, wheel: true });
  }

  const items = await prisma.menuItem.findMany({ where: { qrToken: { not: null } } });
  if (items.length === 0) {
    return res.json({ accepted: false, reason: 'invalid_qr', message: 'Nothing to reveal right now' });
  }

  const progressRows = await prisma.loyaltyProgress.findMany({
    where: { userId, menuItemId: { in: items.map((i) => i.id) } },
  });
  const progressByItem = new Map(progressRows.map((p) => [p.menuItemId, p]));

  // Never land on something this customer has already fully collected — a
  // "surprise gift" that dead-ends on "you already finished this one" would
  // just be confusing.
  const eligible = items.filter((i) => !progressByItem.get(i.id)?.completedAt);
  if (eligible.length === 0) {
    return res.json({
      accepted: false,
      reason: 'all_completed',
      message: "You've collected everything! Redeem your vouchers from My Rewards.",
    });
  }

  const item = eligible[Math.floor(Math.random() * eligible.length)];
  const { tier, reveals } = pickGiftTier();

  let progress = progressByItem.get(item.id);
  if (!progress) {
    progress = await prisma.loyaltyProgress.create({ data: { userId, menuItemId: item.id } });
  }

  const layers = item.layers as any[];
  const total = PUZZLE_PIECES;
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

  await logScan(userId, item.id, true, 'gift_qr');

  res.json({
    accepted: true,
    tier,
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

// A spin has to be earned: each gift_wheel row in the scan log is one spin won
// from the Gifts QR, and each wheel_spin row is one spent. The spin is logged
// first and the counts checked after, so two taps racing each other can't both
// spend the same earned spin.
const notWheelSpin = { OR: [{ reason: null }, { reason: { not: 'wheel_spin' } }] };

async function spinsLeft(userId: number) {
  const [earned, spent] = await Promise.all([
    prisma.scanLog.count({ where: { userId, reason: 'gift_wheel' } }),
    prisma.scanLog.count({ where: { userId, reason: 'wheel_spin' } }),
  ]);
  return earned - spent;
}

loyaltyRouter.post('/wheel/spin', async (req, res) => {
  const userId = (req.auth as any).userId;

  const spend = await prisma.scanLog.create({ data: { userId, accepted: true, reason: 'wheel_spin' } });
  if ((await spinsLeft(userId)) < 0) {
    await prisma.scanLog.delete({ where: { id: spend.id } });
    return res.status(403).json({ error: 'no_spin', reason: 'no_spin' });
  }

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
  if (!voucher) return res.status(404).json({ error: 'voucher_not_found' });
  if (voucher.redeemedAt) return res.status(400).json({ error: 'already_redeemed' });

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

// Best-effort result classification — the scan log only ever recorded accept/reject + a reason,
// never the richer revealed/completed/tier/from→to detail the admin panel's Scans tab shows, so
// that finer detail isn't available for history captured before this endpoint existed.
function scanResult(l: { accepted: boolean; reason: string | null }): string {
  if (l.accepted) return 'revealed';
  if (l.reason === 'invalid_qr') return 'unknown_code';
  return 'inactive';
}

adminLoyaltyRouter.get('/scanlogs', requireStaff('admin'), async (req, res) => {
  const result = req.query.result as string | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 200;

  const logs = await prisma.scanLog.findMany({
    where: notWheelSpin,
    include: { user: { select: { id: true, name: true, phone: true } }, menuItem: true },
    orderBy: { scannedAt: 'desc' },
    take: 500,
  });

  const scans = logs.map((l) => ({
    id: l.id,
    result: scanResult(l),
    customer: l.user ? { id: l.user.id, name: l.user.name, phone: l.user.phone } : null,
    item: l.menuItem ? { id: l.menuItem.id, name: l.menuItem.name, nameEn: l.menuItem.nameEn } : null,
    at: l.scannedAt,
  }));

  const counts: Record<string, number> = { all: scans.length };
  for (const s of scans) counts[s.result] = (counts[s.result] ?? 0) + 1;

  const filtered = (result ? scans.filter((s) => s.result === result) : scans).slice(0, limit);
  res.json({ scans: filtered, counts });
});

// Rewards → Vouchers: every prize handed out (loyalty cards + wheel), newest first.
// Vouchers carry no expiry date in the schema, so a voucher is either valid or redeemed.
const REDEEM_ROLES = ['admin', 'cashier'];

adminLoyaltyRouter.get('/vouchers', requireStaff('admin', 'manager', 'cashier', 'waiter'), async (req, res) => {
  const state = req.query.state as string | undefined;
  const search = (req.query.search as string | undefined)?.trim();
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const searchWhere = search
    ? {
        OR: [
          { code: { contains: search } },
          { user: { name: { contains: search, mode: 'insensitive' as const } } },
          { user: { phone: { contains: search } } },
        ],
      }
    : {};
  const stateWhere =
    state === 'valid' ? { redeemedAt: null } : state === 'redeemed' ? { redeemedAt: { not: null } } : state === 'expired' ? { id: -1 } : {};

  const [rows, total, valid, redeemed] = await Promise.all([
    prisma.voucher.findMany({
      where: { ...searchWhere, ...stateWhere },
      include: { user: { select: { id: true, name: true, phone: true } }, menuItem: { select: { name: true, rewardValue: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.voucher.count({ where: { ...searchWhere, ...stateWhere } }),
    prisma.voucher.count({ where: { ...searchWhere, redeemedAt: null } }),
    prisma.voucher.count({ where: { ...searchWhere, redeemedAt: { not: null } } }),
  ]);

  const canRedeem = REDEEM_ROLES.includes((req.auth as any).role);
  res.json({
    vouchers: rows.map((v) => ({
      id: v.id,
      code: v.code,
      reward: v.label ?? v.menuItem?.rewardValue ?? v.menuItem?.name ?? '—',
      source: v.source,
      state: v.redeemedAt ? 'redeemed' : 'valid',
      customer: v.user,
      createdAt: v.createdAt,
      redeemedAt: v.redeemedAt,
      expiresAt: null,
      redeemedBy: null,
      can: { redeem: canRedeem && !v.redeemedAt },
    })),
    total,
    page,
    counts: { all: valid + redeemed, valid, redeemed, expired: 0 },
  });
});

// Rewards → Stats: program totals plus per-card progress.
adminLoyaltyRouter.get('/stats', requireStaff('admin', 'manager'), async (_req, res) => {
  const [scans, vouchersValid, vouchersRedeemed, collectorRows, cards, progress, scanRows, redeemedRows] = await Promise.all([
    prisma.scanLog.count({ where: { accepted: true, ...notWheelSpin } }),
    prisma.voucher.count({ where: { redeemedAt: null } }),
    prisma.voucher.count({ where: { redeemedAt: { not: null } } }),
    prisma.loyaltyProgress.groupBy({ by: ['userId'], where: { consumedCount: { gt: 0 } } }),
    prisma.menuItem.findMany({
      where: { OR: [{ qrToken: { not: null } }, { qrGroupToken: { not: null } }], layers: { not: Prisma.DbNull } },
      select: { id: true, name: true, nameEn: true, layers: true },
      orderBy: { id: 'asc' },
    }),
    prisma.loyaltyProgress.findMany({ select: { menuItemId: true, revealedCount: true, consumedCount: true } }),
    prisma.scanLog.groupBy({ by: ['menuItemId'], where: { accepted: true }, _count: true }),
    prisma.voucher.groupBy({ by: ['menuItemId'], where: { redeemedAt: { not: null }, source: 'loyalty' }, _count: true }),
  ]);
  const loyaltyVouchers = await prisma.voucher.groupBy({ by: ['menuItemId'], where: { source: 'loyalty' }, _count: true });

  const count = (rows: { menuItemId: number | null; _count: number }[], id: number) =>
    rows.find((r) => r.menuItemId === id)?._count ?? 0;

  const items = cards.map((c) => {
    const pieces = PUZZLE_PIECES;
    const mine = progress.filter((p) => p.menuItemId === c.id && p.consumedCount > 0);
    const avg = mine.length ? mine.reduce((s, p) => s + Math.min(p.revealedCount / pieces, 1), 0) / mine.length : 0;
    return {
      id: c.id,
      name: c.name,
      nameEn: c.nameEn,
      collectors: mine.length,
      scans: count(scanRows, c.id),
      completions: count(loyaltyVouchers, c.id),
      redeemed: count(redeemedRows, c.id),
      averageProgress: Math.round(avg * 100) / 100,
    };
  });

  res.json({
    totals: {
      scans,
      collectors: collectorRows.length,
      completions: loyaltyVouchers.reduce((s, r) => s + r._count, 0),
      vouchersValid,
      vouchersRedeemed,
      vouchersExpired: 0,
    },
    // scan logs don't record which rarity sticker was used, so there's nothing to break down yet
    byTier: {},
    items,
  });
});

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requestOtp, checkOtp, consumeOtp } from '../lib/otp';
import { signToken } from '../lib/jwt';
import { requireUser } from '../middleware/auth';
import { normalizePhone, phoneVariants } from '../lib/phone';

// A row with no password is either a deleted account (DELETE /account renames
// it to DELETED_NAME) or an old account made before passwords existed.
const DELETED_NAME = 'Deleted User';
type UserRow = { id: number; name: string; phone: string; passwordHash: string | null; createdAt: Date };
const isDeleted = (u: UserRow) => !u.passwordHash && u.name === DELETED_NAME;
const needsPassword = (u: UserRow) => !u.passwordHash && u.name !== DELETED_NAME;

/** The account on this number, whichever way the number was typed or stored. */
async function findUserByPhone(raw: string) {
  return prisma.user.findFirst({ where: { phone: { in: phoneVariants(raw) } }, orderBy: { id: 'asc' } });
}

// Registering accepts an old password-less account (it finishes setting it up)
// and a deleted one (the number starts over); only a live account blocks it.
const blocksSignup = (u: UserRow | null) => !!u?.passwordHash;

export const authRouter = Router();

function publicUser(user: { id: number; name: string; phone: string; createdAt: Date }) {
  return { id: user.id, name: user.name, phone: user.phone, createdAt: user.createdAt };
}

const requestSchema = z.object({
  phone: z.string().min(6),
  // "register" rejects up front if the phone already has an account, so the
  // customer finds out before ever seeing the code screen instead of after
  // typing the code in. "reset" mirrors that in the other direction — it
  // needs the account to already exist (and not be a deleted one, see
  // passwordHash check below), so it rejects up front too instead of sending
  // a code the customer would never be able to use.
  purpose: z.enum(['register', 'reset']).optional(),
});

authRouter.post('/otp/request', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_phone' });
  const phone = normalizePhone(parsed.data.phone);
  const { purpose } = parsed.data;
  if (phone.length < 9) return res.status(400).json({ error: 'invalid_phone' });

  if (purpose === 'register') {
    if (blocksSignup(await findUserByPhone(phone))) return res.status(409).json({ error: 'phone_already_registered' });
  } else if (purpose === 'reset') {
    const existing = await findUserByPhone(phone);
    if (!existing || isDeleted(existing)) return res.status(404).json({ error: 'no_account_for_phone' });
  }

  await requestOtp(phone);
  res.json({ ok: true });
});

const verifySchema = z.object({
  phone: z.string().min(6),
  code: z.string().length(6),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});

// Signup only — an existing account on this phone must go through /login
// (or /password-reset if they forgot their password), never get silently
// logged into here. That silent-login-into-the-old-account behavior was the
// source of "accounts on the same number interfering with each other".
authRouter.post('/otp/verify', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const { code, name, password } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);

  const existing = await findUserByPhone(phone);
  if (blocksSignup(existing)) return res.status(409).json({ error: 'phone_already_registered' });

  if (!name) return res.status(400).json({ error: 'name_required_for_new_user' });
  if (!password) return res.status(400).json({ error: 'password_required_for_new_user' });

  const result = await checkOtp(phone, code);
  if (!result.valid) return res.status(400).json({ error: 'invalid_or_expired_code' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    // old account without a password: it's theirs — finish setting it up, keeping its history
    if (existing && needsPassword(existing)) {
      return tx.user.update({ where: { id: existing.id }, data: { name, passwordHash, phone } });
    }
    // deleted account: park its number so this one starts fresh (its orders stay with the old row)
    if (existing) {
      await tx.user.update({ where: { id: existing.id }, data: { phone: `deleted-${existing.id}-${existing.phone}` } });
    }
    return tx.user.create({ data: { phone, name, passwordHash } });
  });
  await consumeOtp(result.otpId!);

  const token = signToken({ kind: 'user', userId: user.id });
  res.json({ token, user: publicUser(user) });
});

const loginSchema = z.object({ phone: z.string().min(6), password: z.string().min(1) });

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const user = await findUserByPhone(parsed.data.phone);
  if (!user) return res.status(401).json({ error: 'no_account_for_phone' });
  // A deleted account keeps its row (see DELETE /account); tell the customer it's
  // gone (they can register the number again) rather than "wrong password".
  if (isDeleted(user)) return res.status(401).json({ error: 'account_deleted' });
  // An old account from before passwords: it exists, it just has no password yet.
  if (!user.passwordHash) return res.status(401).json({ error: 'password_not_set' });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
  // blocked by staff from the admin Customers screen
  if (user.blockedAt) return res.status(403).json({ error: 'account_blocked' });

  const token = signToken({ kind: 'user', userId: user.id });
  res.json({ token, user: publicUser(user) });
});

// Forgot password: request the OTP via /otp/request (purpose "reset"), then
// confirm here with the code plus a new password. Works for any account on the
// number that isn't deleted — including an old one that never had a password.
const passwordResetConfirmSchema = z.object({
  phone: z.string().min(6),
  code: z.string().length(6),
  newPassword: z.string().min(6),
});

authRouter.post('/password-reset/confirm', async (req, res) => {
  const parsed = passwordResetConfirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const { code, newPassword } = parsed.data;
  const phone = normalizePhone(parsed.data.phone);

  const user = await findUserByPhone(phone);
  if (!user) return res.status(404).json({ error: 'no_account_for_phone' });
  // Resetting must not resurrect a deleted account (an old password-less one is fine).
  if (isDeleted(user)) return res.status(404).json({ error: 'no_account_for_phone' });

  const result = await checkOtp(phone, code);
  if (!result.valid) return res.status(400).json({ error: 'invalid_or_expired_code' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash, phone } });
  await consumeOtp(result.otpId!);

  const token = signToken({ kind: 'user', userId: updated.id });
  res.json({ token, user: publicUser(updated) });
});

// Full hard-delete isn't possible here: Order.userId is required (not nullable),
// and deleting completed orders would erase real payment/revenue history the
// restaurant needs to keep. So this wipes everything that's purely personal —
// loyalty progress, vouchers, scan history — detaches the customer from any
// reservations (which support a null userId, same as a walk-in booking), then
// anonymizes the User row's name and clears passwordHash so the account can
// never be logged into (or password-reset) again. Their past orders stay
// intact for accounting, just no longer tied to identifying info.
// The phone number is left as-is so login can say "this account was deleted"
// instead of a generic error; registering the number again parks the old row's
// number and starts a fresh account (see /otp/verify).
authRouter.delete('/account', requireUser, async (req, res) => {
  const userId = (req.auth as any).userId;

  await prisma.$transaction([
    prisma.voucher.deleteMany({ where: { userId } }),
    prisma.loyaltyProgress.deleteMany({ where: { userId } }),
    prisma.scanLog.deleteMany({ where: { userId } }),
    prisma.reservation.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.update({
      where: { id: userId },
      data: { name: DELETED_NAME, passwordHash: null },
    }),
  ]);

  res.json({ ok: true });
});

export const staffAuthRouter = Router();

const staffLoginSchema = z.object({ phone: z.string().min(6), password: z.string().min(1) });

staffAuthRouter.post('/login', async (req, res) => {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const staff = await prisma.staff.findUnique({ where: { phone: parsed.data.phone } });
  // every attempt lands in the Staff → Login log; logging must never block a sign-in
  const logAttempt = (ok: boolean, reason: string | null) =>
    prisma.staffLoginLog
      .create({
        data: {
          staffId: staff?.id ?? null,
          phone: parsed.data.phone,
          ok,
          reason,
          ip: req.ip ?? null,
          userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
        },
      })
      .catch((e) => console.error('login log failed', e));

  if (!staff) {
    await logAttempt(false, 'unknown_phone');
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  const ok = await bcrypt.compare(parsed.data.password, staff.passwordHash);
  if (!ok) {
    await logAttempt(false, 'wrong_password');
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  // the roster's on/off switch — a disabled account must not be able to sign back in
  if (!staff.active) {
    await logAttempt(false, 'staff_disabled');
    return res.status(403).json({ error: 'staff_disabled' });
  }

  await logAttempt(true, null);
  const token = signToken({ kind: 'staff', staffId: staff.id, role: staff.role });
  res.json({ token, staff: { id: staff.id, name: staff.name, phone: staff.phone, role: staff.role } });
});

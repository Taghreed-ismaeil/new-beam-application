import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requestOtp, checkOtp, consumeOtp } from '../lib/otp';
import { signToken } from '../lib/jwt';

export const authRouter = Router();

function publicUser(user: { id: number; name: string; phone: string; createdAt: Date }) {
  return { id: user.id, name: user.name, phone: user.phone, createdAt: user.createdAt };
}

const requestSchema = z.object({
  phone: z.string().min(6),
  // "register" rejects up front if the phone already has an account, so the
  // customer finds out before ever seeing the code screen instead of after
  // typing the code in. Password-reset omits this (or sends "reset") since
  // it needs the account to already exist.
  purpose: z.enum(['register', 'reset']).optional(),
});

authRouter.post('/otp/request', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_phone' });
  const { phone, purpose } = parsed.data;

  if (purpose === 'register') {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ error: 'phone_already_registered' });
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
  const { phone, code, name, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return res.status(409).json({ error: 'phone_already_registered' });

  if (!name) return res.status(400).json({ error: 'name_required_for_new_user' });
  if (!password) return res.status(400).json({ error: 'password_required_for_new_user' });

  const result = await checkOtp(phone, code);
  if (!result.valid) return res.status(400).json({ error: 'invalid_or_expired_code' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { phone, name, passwordHash } });
  await consumeOtp(result.otpId!);

  const token = signToken({ kind: 'user', userId: user.id });
  res.json({ token, user: publicUser(user) });
});

const loginSchema = z.object({ phone: z.string().min(6), password: z.string().min(1) });

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const user = await prisma.user.findUnique({ where: { phone: parsed.data.phone } });
  if (!user?.passwordHash) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken({ kind: 'user', userId: user.id });
  res.json({ token, user: publicUser(user) });
});

// Forgot password: request the OTP via the existing /otp/request endpoint
// (it doesn't care whether the phone has an account yet), then confirm here
// with the code plus a new password. Only works for a phone that already has
// an account — there's no password to reset otherwise.
const passwordResetConfirmSchema = z.object({
  phone: z.string().min(6),
  code: z.string().length(6),
  newPassword: z.string().min(6),
});

authRouter.post('/password-reset/confirm', async (req, res) => {
  const parsed = passwordResetConfirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });
  const { phone, code, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.status(404).json({ error: 'no_account_for_phone' });

  const result = await checkOtp(phone, code);
  if (!result.valid) return res.status(400).json({ error: 'invalid_or_expired_code' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await consumeOtp(result.otpId!);

  const token = signToken({ kind: 'user', userId: updated.id });
  res.json({ token, user: publicUser(updated) });
});

export const staffAuthRouter = Router();

const staffLoginSchema = z.object({ phone: z.string().min(6), password: z.string().min(1) });

staffAuthRouter.post('/login', async (req, res) => {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input' });

  const staff = await prisma.staff.findUnique({ where: { phone: parsed.data.phone } });
  if (!staff) return res.status(401).json({ error: 'invalid_credentials' });

  const ok = await bcrypt.compare(parsed.data.password, staff.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

  const token = signToken({ kind: 'staff', staffId: staff.id, role: staff.role });
  res.json({ token, staff: { id: staff.id, name: staff.name, phone: staff.phone, role: staff.role } });
});

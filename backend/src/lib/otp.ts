import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { prisma } from './prisma';

// 15 min while developing with the console provider (there's a human relay step — asking for the
// code, checking the log, replying — that eats minutes). Tighten back to ~5 once real WhatsApp
// delivery is wired up and the code reaches the phone instantly.
const OTP_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_OTP_TEMPLATE ?? 'otp_login';

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function deliver(phone: string, code: string) {
  if (env.otpProvider === 'whatsapp') {
    await sendViaWhatsApp(phone, code);
  } else {
    // Dev default: no WhatsApp account needed yet. The code just shows up in the server log.
    console.log(`[OTP:console] ${phone} -> ${code}`);
  }
}

async function sendViaWhatsApp(phone: string, code: string) {
  const url = `https://graph.facebook.com/v20.0/${env.whatsapp.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: WHATSAPP_TEMPLATE_NAME,
        language: { code: 'ar' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp OTP send failed (${res.status}): ${body}`);
  }
}

export async function requestOtp(phone: string) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });
  await deliver(phone, code);
}

// Checks the code without burning it — a new customer needs a second round-trip (to supply
// their name) before signup actually completes, and the code must still be valid for that.
export async function checkOtp(phone: string, code: string): Promise<{ valid: boolean; otpId?: number }> {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) return { valid: false };
  if (otp.expiresAt < new Date()) return { valid: false };
  if (otp.attemptCount >= MAX_ATTEMPTS) return { valid: false };

  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attemptCount: { increment: 1 } } });
    return { valid: false };
  }

  return { valid: true, otpId: otp.id };
}

export async function consumeOtp(otpId: number) {
  await prisma.otpCode.update({ where: { id: otpId }, data: { consumedAt: new Date() } });
}

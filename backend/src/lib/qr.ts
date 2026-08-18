import crypto from 'crypto';
import QRCode from 'qrcode';
import { uploadBuffer } from './r2';

export function makeToken(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

export async function generateQrImage(token: string): Promise<string> {
  const buffer = await QRCode.toBuffer(token, { width: 400, margin: 2 });
  await uploadBuffer(`qrcodes/${token}.png`, buffer, 'image/png');
  return `/qrcodes/${token}.png`;
}

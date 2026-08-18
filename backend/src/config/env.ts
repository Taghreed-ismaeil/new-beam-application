import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}


export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  jwtStaffExpiresIn: process.env.JWT_STAFF_EXPIRES_IN ?? '7d',
  otpProvider: (process.env.OTP_PROVIDER ?? 'console') as 'console' | 'whatsapp',
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  },
  r2: {
    accountId: required('R2_ACCOUNT_ID'),
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    bucket: required('R2_BUCKET'),
    publicUrl: required('R2_PUBLIC_URL'),
  },
  // TESTING ONLY: lets any logged-in user scan any loyalty QR without a real purchase behind it,
  // so you don't need a fresh counter-sale every time you test with a new phone number. Turn this
  // back to false before real customers use the app — it's the whole anti-fraud point of the
  // feature.
  loyaltySkipPurchaseCheck: process.env.LOYALTY_SKIP_PURCHASE_CHECK === 'true',
};

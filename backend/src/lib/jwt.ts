import jwt, { SignOptions } from 'jsonwebtoken';
import { StaffRole } from '@prisma/client';
import { env } from '../config/env';

export type AuthTokenPayload =
  | { kind: 'user'; userId: number }
  | { kind: 'staff'; staffId: number; role: StaffRole };

export function signToken(payload: AuthTokenPayload): string {
  // Staff accounts can see/edit orders, financials, and customer data, so a stolen staff token
  // does far more damage than a stolen customer token — give it a much shorter lifetime.
  const expiresIn = payload.kind === 'staff' ? env.jwtStaffExpiresIn : env.jwtExpiresIn;
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

import { NextFunction, Request, Response } from 'express';
import { StaffRole } from '@prisma/client';
import { AuthTokenPayload, verifyToken } from '../lib/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.auth?.kind !== 'user') return res.status(403).json({ error: 'forbidden' });
    next();
  });
}

export function requireStaff(...roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (req.auth?.kind !== 'staff') return res.status(403).json({ error: 'forbidden' });
      if (roles.length && !roles.includes(req.auth.role)) return res.status(403).json({ error: 'forbidden' });
      next();
    });
  };
}

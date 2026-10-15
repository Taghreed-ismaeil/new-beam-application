import { NextFunction, Request, Response } from 'express';
import { StaffRole } from '@prisma/client';
import { AuthTokenPayload, verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

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
    // blocked from the admin Customers screen — checked per request so it applies to live sessions too
    prisma.user
      .findUnique({ where: { id: req.auth.userId }, select: { blockedAt: true } })
      .then((user) => {
        if (!user) return res.status(401).json({ error: 'invalid_token' });
        if (user.blockedAt) return res.status(403).json({ error: 'account_blocked' });
        next();
      })
      .catch(next);
  });
}

export function requireStaff(...roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (req.auth?.kind !== 'staff') return res.status(403).json({ error: 'forbidden' });
      if (roles.length && !roles.includes(req.auth.role)) return res.status(403).json({ error: 'forbidden' });
      // a token issued before the account was switched off must stop working too (401 → the app signs out)
      prisma.staff
        .findUnique({ where: { id: req.auth.staffId }, select: { active: true } })
        .then((staff) => {
          if (!staff?.active) return res.status(401).json({ error: 'staff_disabled' });
          next();
        })
        .catch(next);
    });
  };
}

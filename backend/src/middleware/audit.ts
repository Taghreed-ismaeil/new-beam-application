import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Records every successful admin-panel change for the Staff → Activity tab. Runs in front of the
// /api/admin routers and writes once the response has finished, so it only logs what actually
// happened (2xx) and never slows down or breaks the request itself.

const VERBS: Record<string, string> = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' };
// trailing path words that describe the action better than the HTTP verb does
const NAMED_ACTIONS = new Set(['status', 'block', 'redeem', 'adjust', 'reorder', 'regenerate', 'confirm-payment', 'counter-sale']);

export function describe(method: string, path: string) {
  const parts = path.replace(/^\/api\/admin\/?/, '').split('?')[0].split('/').filter(Boolean);
  const idPart = parts.find((p) => /^\d+$/.test(p));
  const last = parts[parts.length - 1];
  const words = parts.filter((p) => !/^\d+$/.test(p) && !NAMED_ACTIONS.has(p));
  return {
    action: NAMED_ACTIONS.has(last) ? last.replace(/-/g, '_') : (VERBS[method] ?? method.toLowerCase()),
    entity: words.join('/') || 'admin',
    entityId: idPart ? Number(idPart) : null,
  };
}

export function auditAdminChanges(req: Request, res: Response, next: NextFunction) {
  if (!VERBS[req.method] || req.originalUrl.startsWith('/api/admin/uploads')) return next();
  res.on('finish', () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    if (req.auth?.kind !== 'staff') return;
    const { action, entity, entityId } = describe(req.method, req.originalUrl);
    prisma.staffAuditLog
      .create({ data: { staffId: req.auth.staffId, action, entity, entityId } })
      .catch((e) => console.error('audit log failed', e));
  });
  next();
}

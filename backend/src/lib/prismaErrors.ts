import { Response } from 'express';

// Deleting a row that's still referenced elsewhere (e.g. a menu item that's part of past orders)
// must not corrupt that history — the DB's foreign key correctly refuses it. Turn that into a
// clear message instead of a raw 500, and tell the user to deactivate/hide instead of deleting.
export function handleDeleteError(err: any, res: Response, friendlyName: string) {
  if (err?.code === 'P2003') {
    return res.status(400).json({
      error: 'in_use',
      message: `ما فيك تحذف ${friendlyName} لأنه مرتبط بسجلات ثانية (زي طلبات سابقة) — استخدم خيار الإخفاء/الإيقاف بدل الحذف.`,
    });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'not_found' });
  }
  throw err;
}

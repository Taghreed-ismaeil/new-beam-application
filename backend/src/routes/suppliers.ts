import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { handleDeleteError } from '../lib/prismaErrors';

export const adminSuppliersRouter = Router();
adminSuppliersRouter.use(requireStaff('admin', 'manager'));

adminSuppliersRouter.get('/', async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  res.json({ suppliers });
});

const supplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

adminSuppliersRouter.post('/', async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const supplier = await prisma.supplier.create({ data: parsed.data });
  res.json({ supplier });
});

adminSuppliersRouter.put('/:id', async (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const supplier = await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: parsed.data });
  res.json({ supplier });
});

adminSuppliersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالمورد');
  }
});

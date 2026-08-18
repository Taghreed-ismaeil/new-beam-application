import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';

export const adminStaffRouter = Router();

function toPublicStaff(staff: any) {
  const { passwordHash, ...rest } = staff;
  return rest;
}

// Read access is shared with managers (they need the roster to assign waiters to orders);
// every mutation below stays admin-only.
adminStaffRouter.get('/', requireStaff('admin', 'manager'), async (_req, res) => {
  const staff = await prisma.staff.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ staff: staff.map(toPublicStaff) });
});

adminStaffRouter.use(requireStaff('admin'));

const roleEnum = z.enum(['admin', 'chef', 'cashier', 'manager', 'waiter']);

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  password: z.string().min(4),
  role: roleEnum,
});

adminStaffRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const existing = await prisma.staff.findUnique({ where: { phone: parsed.data.phone } });
  if (existing) return res.status(400).json({ error: 'phone_already_used' });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const staff = await prisma.staff.create({
    data: { name: parsed.data.name, phone: parsed.data.phone, role: parsed.data.role, passwordHash },
  });
  res.json({ staff: toPublicStaff(staff) });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(6).optional(),
  role: roleEnum.optional(),
  active: z.boolean().optional(),
  password: z.string().min(4).optional(),
});

adminStaffRouter.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const { password, ...rest } = parsed.data;

  const staff = await prisma.staff.update({
    where: { id: Number(req.params.id) },
    data: {
      ...rest,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  res.json({ staff: toPublicStaff(staff) });
});

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { upload, uploadedFileUrl } from '../lib/upload';

export const adminExpensesRouter = Router();
adminExpensesRouter.use(requireStaff('admin', 'manager'));

adminExpensesRouter.get('/', async (req, res) => {
  const category = req.query.category as string | undefined;
  const from = req.query.from as string | undefined; // YYYY-MM-DD
  const to = req.query.to as string | undefined;

  let dateFilter = {};
  if (from || to) {
    dateFilter = {
      expenseDate: {
        ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
        ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
      },
    };
  }

  const expenses = await prisma.expense.findMany({
    where: {
      ...(category ? { category } : {}),
      ...dateFilter,
    },
    include: { recordedByStaff: { select: { id: true, name: true, role: true } } },
    orderBy: { expenseDate: 'desc' },
    take: 500,
  });
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  res.json({ expenses, total });
});

const expenseSchema = z.object({
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  expenseDate: z.string().min(1),
});

adminExpensesRouter.post('/', upload.single('receipt'), async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const staffId = (req.auth as any).staffId;

  const expense = await prisma.expense.create({
    data: {
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expenseDate: new Date(parsed.data.expenseDate),
      recordedByStaffId: staffId,
      receiptUrl: req.file ? await uploadedFileUrl(req.file) : undefined,
    },
  });
  res.json({ expense });
});

adminExpensesRouter.delete('/:id', async (req, res) => {
  await prisma.expense.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

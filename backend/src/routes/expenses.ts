import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { upload, uploadedFileUrl } from '../lib/upload';
import { handleDeleteError } from '../lib/prismaErrors';

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
  const byCategory: Record<string, number> = {};
  for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);

  res.json({
    expenses: expenses.map((e) => ({
      id: e.id,
      category: e.category,
      note: e.description,
      amount: e.amount,
      date: e.expenseDate,
      createdBy: e.recordedByStaff,
    })),
    total,
    byCategory,
  });
});

const expenseSchema = z.object({
  category: z.string().min(1),
  note: z.string().optional(),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
});

adminExpensesRouter.post('/', upload.single('receipt'), async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const staffId = (req.auth as any).staffId;

  const expense = await prisma.expense.create({
    data: {
      category: parsed.data.category,
      description: parsed.data.note,
      amount: parsed.data.amount,
      expenseDate: new Date(parsed.data.date),
      recordedByStaffId: staffId,
      receiptUrl: req.file ? await uploadedFileUrl(req.file) : undefined,
    },
    include: { recordedByStaff: { select: { id: true, name: true, role: true } } },
  });
  res.json({
    expense: {
      id: expense.id,
      category: expense.category,
      note: expense.description,
      amount: expense.amount,
      date: expense.expenseDate,
      createdBy: expense.recordedByStaff,
    },
  });
});

const patchSchema = z.object({
  category: z.string().min(1).optional(),
  note: z.string().optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.string().min(1).optional(),
});

adminExpensesRouter.put('/:id', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const expense = await prisma.expense.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
      ...(parsed.data.note !== undefined ? { description: parsed.data.note } : {}),
      ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
      ...(parsed.data.date !== undefined ? { expenseDate: new Date(parsed.data.date) } : {}),
    },
    include: { recordedByStaff: { select: { id: true, name: true, role: true } } },
  });
  res.json({
    expense: {
      id: expense.id,
      category: expense.category,
      note: expense.description,
      amount: expense.amount,
      date: expense.expenseDate,
      createdBy: expense.recordedByStaff,
    },
  });
});

adminExpensesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالمصروف');
  }
});

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { handleDeleteError } from '../lib/prismaErrors';

export const adminSuppliersRouter = Router();
adminSuppliersRouter.use(requireStaff('admin', 'manager'));

const withIngredients = {
  items: { select: { id: true, name: true, nameEn: true, unit: true }, orderBy: { name: 'asc' as const } },
};

// Shape app/admin/suppliers.jsx works with: `note` (the column is `notes`), plus the ingredients
// this supplier provides — both as objects for the list and as ids for the edit form's toggles.
function toPublicSupplier(s: any) {
  const { items = [], notes, ...rest } = s;
  return { ...rest, note: notes ?? null, ingredients: items, ingredientIds: items.map((i: { id: number }) => i.id) };
}

adminSuppliersRouter.get('/', async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' }, include: withIngredients });
  res.json({ suppliers: suppliers.map(toPublicSupplier) });
});

// The form sends cleared fields as null, so every optional text field accepts null as "empty".
const optionalText = z.string().trim().nullish();
const supplierSchema = z.object({
  name: z.string().trim().min(1),
  contactName: optionalText,
  phone: optionalText,
  email: optionalText,
  address: optionalText,
  note: optionalText,
  notes: optionalText,
  ingredientIds: z.array(z.coerce.number().int().positive()).optional(),
});

function toData(d: Partial<z.infer<typeof supplierSchema>>) {
  const empty = (v: string | null | undefined) => (v === undefined ? undefined : v || null);
  return {
    ...(d.name !== undefined ? { name: d.name } : {}),
    contactName: empty(d.contactName),
    phone: empty(d.phone),
    email: empty(d.email),
    address: empty(d.address),
    notes: empty(d.note !== undefined ? d.note : d.notes),
  };
}

/** Link exactly `ids` to this supplier: newly picked ingredients point at it, unpicked ones are released. */
async function setIngredients(supplierId: number, ids: number[]) {
  await prisma.$transaction([
    prisma.inventoryItem.updateMany({ where: { supplierId, id: { notIn: ids } }, data: { supplierId: null } }),
    prisma.inventoryItem.updateMany({ where: { id: { in: ids } }, data: { supplierId } }),
  ]);
}

adminSuppliersRouter.post('/', async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const created = await prisma.supplier.create({ data: toData(parsed.data) as any });
  if (parsed.data.ingredientIds) await setIngredients(created.id, parsed.data.ingredientIds);
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: created.id }, include: withIngredients });
  res.json({ supplier: toPublicSupplier(supplier) });
});

adminSuppliersRouter.put('/:id', async (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const id = Number(req.params.id);
  await prisma.supplier.update({ where: { id }, data: toData(parsed.data) });
  if (parsed.data.ingredientIds) await setIngredients(id, parsed.data.ingredientIds);
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id }, include: withIngredients });
  res.json({ supplier: toPublicSupplier(supplier) });
});

adminSuppliersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالمورد');
  }
});

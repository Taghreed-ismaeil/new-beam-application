import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { upload, uploadedFileUrl } from '../lib/upload';
import { handleDeleteError } from '../lib/prismaErrors';

export const offersRouter = Router();

offersRouter.get('/', async (_req, res) => {
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
  });
  res.json({ offers });
});

export const adminOffersRouter = Router();
adminOffersRouter.use(requireStaff('admin'));

adminOffersRouter.get('/', async (_req, res) => {
  const offers = await prisma.offer.findMany({ orderBy: { id: 'desc' } });
  res.json({ offers });
});

const offerSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive(),
  menuItemIds: z.string().optional(), // JSON array string
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

adminOffersRouter.post('/', upload.single('image'), async (req, res) => {
  const parsed = offerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });

  const offer = await prisma.offer.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      menuItemIds: parsed.data.menuItemIds ? JSON.parse(parsed.data.menuItemIds) : [],
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
      imageUrl: req.file ? await uploadedFileUrl(req.file) : undefined,
    },
  });
  res.json({ offer });
});

adminOffersRouter.put('/:id', upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as Record<string, string>;
  const offer = await prisma.offer.update({
    where: { id },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.discountType ? { discountType: body.discountType } : {}),
      ...(body.discountValue ? { discountValue: Number(body.discountValue) } : {}),
      ...(body.menuItemIds ? { menuItemIds: JSON.parse(body.menuItemIds) } : {}),
      ...(body.active !== undefined ? { active: body.active === 'true' } : {}),
      ...(body.startsAt !== undefined ? { startsAt: body.startsAt ? new Date(body.startsAt) : null } : {}),
      ...(body.endsAt !== undefined ? { endsAt: body.endsAt ? new Date(body.endsAt) : null } : {}),
      ...(req.file ? { imageUrl: await uploadedFileUrl(req.file) } : {}),
    },
  });
  res.json({ offer });
});

adminOffersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.offer.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالعرض');
  }
});

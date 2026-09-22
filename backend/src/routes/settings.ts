import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { handleDeleteError } from '../lib/prismaErrors';

export const adminSettingsRouter = Router();
adminSettingsRouter.use(requireStaff('admin'));

function toPublicSettings(restaurant: any, zones: any[]) {
  return {
    name: restaurant.name,
    nameEn: restaurant.nameEn,
    logoUrl: restaurant.logoUrl,
    phone: restaurant.phone,
    email: restaurant.email,
    address: restaurant.address,
    addressEn: restaurant.addressEn,
    openingHours: restaurant.openingHoursText,
    payments: {
      cash: restaurant.paymentsCash,
      card: restaurant.paymentsCard,
      cliq: restaurant.paymentsCliq,
      cliqAlias: restaurant.cliqAlias,
    },
    delivery: {
      enabled: restaurant.deliveryEnabled,
      zones,
    },
  };
}

async function loadSettings() {
  const [restaurant, zones] = await Promise.all([
    prisma.restaurant.upsert({ where: { id: 1 }, create: { id: 1, name: 'المطعم' }, update: {} }),
    prisma.deliveryZone.findMany({ orderBy: { id: 'asc' } }),
  ]);
  return toPublicSettings(restaurant, zones);
}

adminSettingsRouter.get('/', async (_req, res) => {
  res.json({ settings: await loadSettings() });
});

const paymentsSchema = z.object({
  cash: z.boolean().optional(),
  card: z.boolean().optional(),
  cliq: z.boolean().optional(),
  cliqAlias: z.string().nullable().optional(),
});

const settingsSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  addressEn: z.string().nullable().optional(),
  openingHours: z.string().nullable().optional(),
  payments: paymentsSchema.optional(),
  delivery: z.object({ enabled: z.boolean().optional() }).optional(),
});

adminSettingsRouter.put('/', async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const d = parsed.data;

  await prisma.restaurant.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: d.name ?? 'المطعم',
      nameEn: d.nameEn ?? undefined,
      logoUrl: d.logoUrl ?? undefined,
      phone: d.phone ?? undefined,
      email: d.email ?? undefined,
      address: d.address ?? undefined,
      addressEn: d.addressEn ?? undefined,
      openingHoursText: d.openingHours ?? undefined,
      paymentsCash: d.payments?.cash,
      paymentsCard: d.payments?.card,
      paymentsCliq: d.payments?.cliq,
      cliqAlias: d.payments?.cliqAlias ?? undefined,
      deliveryEnabled: d.delivery?.enabled,
    },
    update: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.nameEn !== undefined ? { nameEn: d.nameEn } : {}),
      ...(d.logoUrl !== undefined ? { logoUrl: d.logoUrl } : {}),
      ...(d.phone !== undefined ? { phone: d.phone } : {}),
      ...(d.email !== undefined ? { email: d.email } : {}),
      ...(d.address !== undefined ? { address: d.address } : {}),
      ...(d.addressEn !== undefined ? { addressEn: d.addressEn } : {}),
      ...(d.openingHours !== undefined ? { openingHoursText: d.openingHours } : {}),
      ...(d.payments?.cash !== undefined ? { paymentsCash: d.payments.cash } : {}),
      ...(d.payments?.card !== undefined ? { paymentsCard: d.payments.card } : {}),
      ...(d.payments?.cliq !== undefined ? { paymentsCliq: d.payments.cliq } : {}),
      ...(d.payments?.cliqAlias !== undefined ? { cliqAlias: d.payments.cliqAlias } : {}),
      ...(d.delivery?.enabled !== undefined ? { deliveryEnabled: d.delivery.enabled } : {}),
    },
  });

  res.json({ settings: await loadSettings() });
});

const zoneSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  fee: z.coerce.number().min(0),
  isActive: z.boolean().optional(),
});

adminSettingsRouter.post('/delivery-zones', async (req, res) => {
  const parsed = zoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  await prisma.restaurant.upsert({ where: { id: 1 }, create: { id: 1, name: 'المطعم' }, update: {} });
  const zone = await prisma.deliveryZone.create({
    data: { name: parsed.data.name, nameEn: parsed.data.nameEn, fee: parsed.data.fee, isActive: parsed.data.isActive ?? true },
  });
  res.json({ zone });
});

adminSettingsRouter.put('/delivery-zones/:id', async (req, res) => {
  const parsed = zoneSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() });
  const zone = await prisma.deliveryZone.update({ where: { id: Number(req.params.id) }, data: parsed.data });
  res.json({ zone });
});

adminSettingsRouter.delete('/delivery-zones/:id', async (req, res) => {
  try {
    await prisma.deliveryZone.delete({ where: { id: Number(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    handleDeleteError(err, res, 'هالمنطقة');
  }
});

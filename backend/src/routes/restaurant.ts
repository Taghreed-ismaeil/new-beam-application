import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireStaff } from '../middleware/auth';
import { upload, uploadedFileUrl } from '../lib/upload';

export const restaurantRouter = Router();

restaurantRouter.get('/', async (_req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: 1 } });
  res.json({ restaurant });
});

export const adminRestaurantRouter = Router();

adminRestaurantRouter.put('/', requireStaff('admin'), upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]), async (req, res) => {
  const body = req.body as Record<string, string>;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  const logoUrl = files?.logo?.[0] ? await uploadedFileUrl(files.logo[0]) : undefined;
  const coverImageUrl = files?.cover?.[0] ? await uploadedFileUrl(files.cover[0]) : undefined;

  const restaurant = await prisma.restaurant.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      name: body.name ?? 'المطعم',
      phone: body.phone,
      address: body.address,
      lat: body.lat ? Number(body.lat) : undefined,
      lng: body.lng ? Number(body.lng) : undefined,
      openingHours: body.openingHours ? JSON.parse(body.openingHours) : undefined,
      socialLinks: body.socialLinks ? JSON.parse(body.socialLinks) : undefined,
      cliqAlias: body.cliqAlias,
      logoUrl,
      coverImageUrl,
    },
    update: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
      ...(body.address ? { address: body.address } : {}),
      ...(body.lat ? { lat: Number(body.lat) } : {}),
      ...(body.lng ? { lng: Number(body.lng) } : {}),
      ...(body.openingHours ? { openingHours: JSON.parse(body.openingHours) } : {}),
      ...(body.socialLinks ? { socialLinks: JSON.parse(body.socialLinks) } : {}),
      ...(body.cliqAlias ? { cliqAlias: body.cliqAlias } : {}),
      ...(logoUrl ? { logoUrl } : {}),
      ...(coverImageUrl ? { coverImageUrl } : {}),
    },
  });

  res.json({ restaurant });
});

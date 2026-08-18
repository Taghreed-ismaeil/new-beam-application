import path from 'path';
import multer from 'multer';
import { uploadBuffer } from './r2';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export async function uploadedFileUrl(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname) || '.png';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  await uploadBuffer(`uploads/${filename}`, file.buffer, file.mimetype);
  return `/uploads/${filename}`;
}

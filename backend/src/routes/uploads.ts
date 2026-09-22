import { Router } from 'express';
import { requireStaff } from '../middleware/auth';
import { upload, uploadedFileUrl } from '../lib/upload';

// Generic image upload used by the admin panel's ImageField (menu photos, category covers,
// reward reveal layers, etc.) — lib/admin-api.ts's uploadImage() posts here with a "file" field
// and a "folder" hint, and expects back the path to store on the record being edited.
export const adminUploadsRouter = Router();
adminUploadsRouter.use(requireStaff('admin', 'manager'));

adminUploadsRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const path = await uploadedFileUrl(req.file);
  res.json({ path });
});

import http from 'http';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
// Must load before any routes are registered — patches Express to forward rejected promises
// from async route handlers to the error middleware instead of crashing the whole process
// (Express 4 doesn't do this natively, and an uncaught rejection anywhere takes the server down).
import 'express-async-errors';
import { env } from './config/env';
import { initSocket } from './lib/socket';

import { authRouter, staffAuthRouter } from './routes/auth';
import { restaurantRouter, adminRestaurantRouter } from './routes/restaurant';
import { menuRouter, adminMenuRouter } from './routes/menu';
import { offersRouter, adminOffersRouter } from './routes/offers';
import { tablesRouter, adminTablesRouter } from './routes/tables';
import { ordersRouter, adminOrdersRouter } from './routes/orders';
import { loyaltyRouter, adminLoyaltyRouter } from './routes/loyalty';
import { adminStaffRouter } from './routes/staff';
import { reservationsRouter, adminReservationsRouter } from './routes/reservations';
import { adminInventoryRouter } from './routes/inventory';
import { adminSuppliersRouter } from './routes/suppliers';
import { adminExpensesRouter } from './routes/expenses';
import { adminUploadsRouter } from './routes/uploads';
import { adminSettingsRouter } from './routes/settings';

const app = express();
app.use(cors());
app.use(express.json());

// Images, QR codes, and uploads now live on Cloudflare R2 (see src/lib/r2.ts) instead of local
// disk, so they survive redeploys on hosted backends — no local static file mounts needed.

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/staff/auth', staffAuthRouter);

app.use('/api/restaurant', restaurantRouter);
app.use('/api/admin/restaurant', adminRestaurantRouter);

app.use('/api/menu', menuRouter);
app.use('/api/admin/menu', adminMenuRouter);

app.use('/api/offers', offersRouter);
app.use('/api/admin/offers', adminOffersRouter);

app.use('/api/tables', tablesRouter);
app.use('/api/admin/tables', adminTablesRouter);

app.use('/api/orders', ordersRouter);
app.use('/api/admin/orders', adminOrdersRouter);

app.use('/api/loyalty', loyaltyRouter);
app.use('/api/admin/loyalty', adminLoyaltyRouter);

app.use('/api/admin/staff', adminStaffRouter);

app.use('/api/reservations', reservationsRouter);
app.use('/api/admin/reservations', adminReservationsRouter);

app.use('/api/admin/inventory', adminInventoryRouter);
app.use('/api/admin/suppliers', adminSuppliersRouter);
app.use('/api/admin/expenses', adminExpensesRouter);
app.use('/api/admin/uploads', adminUploadsRouter);
app.use('/api/admin/settings', adminSettingsRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Restaurant app backend running on http://localhost:${env.port}`);
});

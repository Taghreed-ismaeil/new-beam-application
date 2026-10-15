import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Pass the URL explicitly: @prisma/client auto-loads .env on import, which would otherwise
// win over .env.local and silently point a local run at the production database.
export const prisma = new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });

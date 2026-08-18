# Restaurant App — Backend

Node.js + Express + TypeScript + Prisma + PostgreSQL.

## Setup

```bash
npm install
docker compose up -d        # starts Postgres on localhost:5433
npm run prisma:migrate      # creates tables
npm run seed                # restaurant info, staff accounts, sample menu + loyalty items
npm run dev                 # http://localhost:4000
```

## Staff test accounts (from seed)

| Role | Phone | Password |
|---|---|---|
| Admin | 0790000001 | admin123 |
| Cashier | 0790000002 | cashier123 |
| Chef | 0790000003 | chef123 |

## OTP in development

`OTP_PROVIDER=console` (default in `.env`) prints the code to the server terminal instead of
sending a real WhatsApp message — no Meta Business account needed to develop against. Switch to
`OTP_PROVIDER=whatsapp` and fill in `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` once the
WhatsApp Business account is verified.

## Structure

```
src/
  config/env.ts        environment variables
  lib/                  prisma client, jwt, otp, qr generation, image/layer processing, socket.io, uploads
  middleware/auth.ts    requireUser / requireStaff guards
  routes/               one file per domain (auth, restaurant, menu, offers, tables, orders, loyalty)
                         each file exports both the public router and the /api/admin/* router
prisma/
  schema.prisma
  seed.ts
```

# WMS 3PL — Warehouse Management System

Monorepo for the 3PL/4PL test task with separate frontend and backend deployments.

```
┌─────────────────┐      HTTP       ┌─────────────────┐      Prisma      ┌─────────────────┐
│  frontend/      │ ──────────────▶ │  backend/       │ ───────────────▶ │  Supabase       │
│  Vercel         │                 │  Railway        │                  │  PostgreSQL     │
│  Test UI        │                 │  Express API    │                  │  Database       │
└─────────────────┘                 └─────────────────┘                  └─────────────────┘
```

## Project structure

```
/
├── frontend/          → Deploy to Vercel (static test UI)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── build.js
│   └── vercel.json
│
├── backend/           → Deploy to Railway (Node.js API)
│   ├── src/           → Express + Clean Architecture
│   ├── prisma/        → Schema, migrations, seed
│   ├── scripts/       → Database setup helper
│   ├── railway.toml
│   └── package.json
│
├── DEPLOYMENT.md      → Step-by-step deploy guide
└── README.md
```

## Features (client test scope only)

| Requirement | Backend endpoint |
|-------------|------------------|
| **A. Storage Billing** — pallets × daily rate or M³, inbound/outbound fees | `POST /api/billing/generate`, `GET /api/invoices/:id` |
| **B. Stock Transfer** — bin-to-bin, batch/lot + expiry, multi-tenant | `POST /api/inventory/transfer`, `GET /api/inventory` |
| **Audit trail** — who, when, before/after qty | `GET /api/audit-logs` |
| Test UI seed IDs | `GET /api/config/seed-info` |
| API documentation | `GET /api/docs` |

Database design: see `backend/docs/SCHEMA.md`. SQL setup: `backend/supabase/schema.sql` then `seed.sql`.

**API documentation (client submission):** see [`backend/docs/API.md`](backend/docs/API.md) · Swagger UI at `/api/docs` · OpenAPI JSON at `/api/docs/openapi.json`

## Quick start (local)

### 1. Backend + Supabase

```powershell
cd backend
copy .env.example .env
# Edit .env with your Supabase DATABASE_URL and DIRECT_URL

npm install
npm run setup:supabase    # migrate + seed
npm run dev               # http://localhost:3006
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
# Open http://localhost:5173 — set API Base URL to http://localhost:3006
```

Or open `frontend/index.html` and set API Base URL to `http://localhost:3006`.

## Deploy

| Service | Folder | Platform |
|---------|--------|----------|
| Database | — | [Supabase](https://supabase.com) |
| Backend | `backend/` | [Railway](https://railway.app) |
| Frontend | `frontend/` | [Vercel](https://vercel.com) |

See **[RUN.md](./RUN.md)** for step-by-step local + production instructions.  
See **[RUN-ONLINE.md](./RUN-ONLINE.md)** for online deployment (Vercel + Railway).  
See **[CONNECT.md](./CONNECT.md)** for environment variable reference.

## API headers (multi-tenant)

All protected endpoints require:

```
x-client-id: <tenant-uuid>
x-user-id:   <user-uuid>
```

Get IDs via **Load Seed IDs** in the test UI (calls `/api/config/seed-info`).

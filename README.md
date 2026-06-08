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

## Features

| Feature | Backend endpoint |
|---------|------------------|
| 3PL Storage Billing | `POST /api/billing/generate` |
| Inventory Transfer | `POST /api/inventory/transfer` |
| List Inventory | `GET /api/inventory` |
| Get Invoice | `GET /api/invoices/:id` |
| Audit Logs | `GET /api/audit-logs` |
| Seed Info (for UI) | `GET /api/config/seed-info` |
| Swagger Docs | `GET /api/docs` |

## Quick start (local)

### 1. Backend + Supabase

```powershell
cd backend
copy .env.example .env
# Edit .env with your Supabase DATABASE_URL and DIRECT_URL

npm install
npm run setup:supabase    # migrate + seed
npm run dev               # http://localhost:3000
```

### 2. Frontend

```powershell
cd frontend
# Set API_URL in config.js or use the UI field
npx serve .
# Open http://localhost:3000 (or serve port)
```

Or open `frontend/index.html` and set API Base URL to `http://localhost:3000`.

## Deploy

| Service | Folder | Platform |
|---------|--------|----------|
| Database | — | [Supabase](https://supabase.com) |
| Backend | `backend/` | [Railway](https://railway.app) |
| Frontend | `frontend/` | [Vercel](https://vercel.com) |

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full deploy guide.  
See **[CONNECT.md](./CONNECT.md)** for connecting Vercel ↔ Railway ↔ Supabase (env vars).

## API headers (multi-tenant)

All protected endpoints require:

```
x-client-id: <tenant-uuid>
x-user-id:   <user-uuid>
```

Get IDs via **Load Seed IDs** in the test UI (calls `/api/config/seed-info`).

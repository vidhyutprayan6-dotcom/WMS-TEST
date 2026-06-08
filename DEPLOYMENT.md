# Deployment Guide — Supabase + Railway + Vercel

## Architecture

```
frontend/  (Vercel)  ──▶  backend/  (Railway)  ──▶  Supabase  (PostgreSQL)
  Test UI                   Express API               Database
```

| Layer | Folder | Platform | URL example |
|-------|--------|----------|-------------|
| Frontend | `frontend/` | Vercel | `https://wms-ui.vercel.app` |
| Backend | `backend/` | Railway | `https://wms-api.up.railway.app` |
| Database | — | Supabase | `db.xxx.supabase.co` |

---

## Part 1 — Supabase (Database)

### Step 1: Create project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it (e.g. `wms-3pl`), set a database password, choose region
3. Wait for provisioning (~2 min)
4. If paused later, click **Restore project** in the dashboard

### Step 2: Get connection strings

1. Open project → **Connect** → **ORMs** → **Prisma**
2. Copy both URLs into `backend/.env`:

```env
# Session pooler — app runtime (port 6543)
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection — migrations (port 5432, username: postgres)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"
```

> **Never use** `pooler.supabase.com:5432` for migrations — it causes `Schema engine error`.

### Step 3: Create tables + seed data

**Option A — Prisma (recommended)**

```powershell
cd backend
npm install
npm run setup:supabase
```

**Option B — Supabase SQL Editor (if Prisma can't connect)**

1. Open Supabase → **SQL Editor** → **New query**
2. Copy contents of `backend/supabase/schema.sql` and click **Run**
3. Then seed from your machine or Railway:

```powershell
cd backend
npm run prisma:seed
```

Verify in Supabase → **Table Editor** — you should see `clients`, `inventory`, `invoices`, etc.

---

## Part 2 — Railway (Backend)

### Step 1: Push to GitHub

```powershell
cd "F:\STORE TEST TASK"
git add .
git commit -m "Split frontend/backend architecture"
git push
```

### Step 2: Deploy on Railway

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your repo
3. **Settings → Root Directory** → set to `backend`
4. Railway reads `backend/railway.toml` automatically

### Step 3: Environment variables

In Railway → **Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase session pooler (port 6543) |
| `DIRECT_URL` | Supabase direct connection (port 5432) |
| `NODE_ENV` | `production` |
| `API_URL` | Your Railway URL (set after step 4) |
| `FRONTEND_URL` | Your Vercel URL (set after Part 3) |

### Step 4: Generate domain

**Settings → Networking → Generate Domain**

Copy URL: `https://wms-3pl-production.up.railway.app`

Set `API_URL` to this value.

### Step 5: Seed production database (first time)

```powershell
npm install -g @railway/cli
railway login
railway link
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

### Step 6: Verify

- `https://YOUR-RAILWAY-URL/health`
- `https://YOUR-RAILWAY-URL/api/docs`
- `https://YOUR-RAILWAY-URL/api/config/seed-info`

---

## Part 3 — Vercel (Frontend)

### Step 1: Deploy

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework** | Other |
| **Build Command** | `npm run build` |
| **Output Directory** | `.` |

### Step 2: Environment variable

| Variable | Value |
|----------|-------|
| `API_URL` | Your Railway URL |

### Step 3: Deploy & connect CORS

1. Deploy → copy Vercel URL: `https://wms-3pl.vercel.app`
2. Go to Railway → set `FRONTEND_URL` = your Vercel URL
3. Railway redeploys automatically

### Step 4: Test

1. Open Vercel URL
2. **Load Seed IDs** → fetches from Railway
3. **Use Client A** → **List Inventory** → data from Supabase

---

## Local development

```powershell
# Terminal 1 — Backend
cd backend
npm install
npm run setup:supabase
npm run dev

# Terminal 2 — Frontend
cd frontend
npx serve .
```

Set API Base URL in the UI to `http://localhost:3000`.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Schema engine error` | Use `DIRECT_URL` with `db.[REF].supabase.co:5432`, not pooler |
| `P1001 Can't reach database` | Restore paused Supabase project; check password |
| CORS error | Set `FRONTEND_URL` on Railway to exact Vercel URL |
| `NO_SEED_DATA` | Run `railway run npx prisma db seed` |
| Railway builds wrong code | Set Root Directory to `backend` |
| Vercel shows wrong API | Set `API_URL` env var and redeploy |

---

## Checklist

- [ ] Supabase project created
- [ ] `backend/.env` has `DATABASE_URL` + `DIRECT_URL`
- [ ] `npm run setup:supabase` succeeded
- [ ] Tables visible in Supabase Table Editor
- [ ] Railway deployed from `backend/` folder
- [ ] Railway env vars set (both DB URLs + API_URL + FRONTEND_URL)
- [ ] `/health` and `/api/config/seed-info` work
- [ ] Vercel deployed from `frontend/` folder with `API_URL`
- [ ] Test UI loads and calls APIs successfully

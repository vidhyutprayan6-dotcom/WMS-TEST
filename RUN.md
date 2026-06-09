# How to Run This Project

## Architecture

```
frontend/  →  Vercel   (Test UI)
backend/   →  Railway  (API)
Supabase   →  Database (PostgreSQL)
```

---

## Part A — Run locally

### 1. Supabase database

1. Create project at [supabase.com](https://supabase.com)
2. Copy connection strings into `backend/.env`:

```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=require"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
API_URL="http://localhost:3000"
```

3. Create tables + seed:

```powershell
cd backend
npm install
npm run setup:supabase
```

If Prisma can't connect, run `backend/supabase/schema.sql` in Supabase SQL Editor, then:

```powershell
npm run prisma:seed
```

### 2. Backend (Terminal 1)

```powershell
cd backend
npm run dev
```

API runs at **http://localhost:3000**

### 3. Frontend (Terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

> Use `npm run dev` — NOT `npm serve` (that command does not exist).

### 4. Test locally

1. **Load Seed IDs**
2. **Use Client A**
3. **List Inventory**

### Build error on Windows (EPERM)

If `npm run build` fails with `EPERM: operation not permitted`:

- **Stop** `npm run dev` first (Ctrl+C in that terminal)
- Then run `npm run build` again

The dev server locks the Prisma file while running. This only affects local builds — Railway/Vercel builds are unaffected.

---

## Part B — Deploy to Railway (backend)

### 1. Push to GitHub

```powershell
cd "F:\STORE TEST TASK"
git add .
git commit -m "deploy: railway + vercel setup"
git push
```

### 2. Railway project settings

Railway → **WMS-TEST** → **Settings**:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |

Then add **all** variables (see RUN-ONLINE.md) and click **Deploy**.

See **[RUN-ONLINE.md](./RUN-ONLINE.md)** for the complete online deployment guide.

### 3. Railway variables

Go to **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase session pooler (port **6543**) |
| `DIRECT_URL` | Supabase direct (port **5432**, user `postgres`) |
| `NODE_ENV` | `production` |
| `API_URL` | *(set after step 4)* |
| `FRONTEND_URL` | *(set after Vercel deploy)* |

### 4. Generate public URL

**Settings → Networking → Generate Domain**

Example: `https://wms-test-production.up.railway.app`

Set `API_URL` on Railway to this URL.

### 5. Verify Railway

Open in browser:

- `https://YOUR-RAILWAY-URL/health` → `{"status":"ok"}`
- `https://YOUR-RAILWAY-URL/api/config/seed-info` → JSON with client IDs

### 6. Seed production DB (first time)

```powershell
cd backend
npm run prisma:seed
```

Uses your `backend/.env` Supabase connection.

---

## Part C — Deploy to Vercel (frontend)

### 1. Vercel project settings

Vercel → **Settings → General**:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Other |
| **Build Command** | `npm run build` |
| **Output Directory** | `.` |
| **Install Command** | `npm install` |

> Do NOT set Root Directory to `/` — that causes the `fsPath` build error.

### 2. Vercel environment variable

**Settings → Environment Variables:**

| Variable | Value |
|----------|-------|
| `API_URL` | Your Railway URL (no trailing slash) |

Example: `https://wms-test-production.up.railway.app`

### 3. Deploy

Click **Deploy** (or push to GitHub for auto-deploy).

Copy Vercel URL: `https://your-app.vercel.app`

### 4. Connect CORS

Back on **Railway → Variables**, set:

```
FRONTEND_URL=https://your-app.vercel.app
```

Railway redeploys automatically.

---

## Part D — Test production

1. Open your **Vercel URL**
2. API Base URL should show your Railway URL
3. **Load Seed IDs**
4. **Use Client A**
5. **List Inventory** → data from Supabase
6. **Generate Invoice** / **Execute Transfer**

---

## Environment variables summary

| Where | Variable | Purpose |
|-------|----------|---------|
| Railway | `DATABASE_URL` | Supabase pooler (app) |
| Railway | `DIRECT_URL` | Supabase direct (migrations) |
| Railway | `API_URL` | Public backend URL |
| Railway | `FRONTEND_URL` | Vercel URL (CORS) |
| Vercel | `API_URL` | Railway URL (frontend calls API) |
| Local `backend/.env` | All above | Local development |

**No API keys** between Vercel and Railway — only URLs.

---

## Quick checklist

- [ ] Supabase tables created (`setup:supabase` or `schema.sql`)
- [ ] Database seeded (`npm run prisma:seed`)
- [ ] Code pushed to GitHub
- [ ] Railway build succeeds
- [ ] Railway `/health` works
- [ ] Railway variables set (`DATABASE_URL`, `DIRECT_URL`, `API_URL`, `FRONTEND_URL`)
- [ ] Vercel `API_URL` set and redeployed
- [ ] Test UI works on Vercel URL

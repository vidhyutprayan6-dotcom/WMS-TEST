# Deployment Guide — Supabase + Railway + Vercel

Deploy the WMS test task with:

| Service | Role | URL example |
|---------|------|-------------|
| **Supabase** | PostgreSQL database | `aws-0-xxx.pooler.supabase.com` |
| **Railway** | Node.js backend API | `https://wms-api.up.railway.app` |
| **Vercel** | Static test UI (frontend) | `https://wms-ui.vercel.app` |

---

## Overview

```
[Vercel Frontend]  ──HTTP──▶  [Railway Backend]  ──Prisma──▶  [Supabase PostgreSQL]
     Test UI                      Express API                    Database
```

---

## Part 1 — Supabase (Database)

### Step 1: Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Choose an organization, name (e.g. `wms-3pl`), database password, and region
4. Wait ~2 minutes for the project to provision

### Step 2: Get BOTH connection strings (important)

Supabase needs **two different URLs**. Using only one (especially pooler on port 5432) causes `Schema engine error`.

1. Open your project → click **Connect** (top bar)
2. Select **ORMs** tab → **Prisma**
3. Copy the two URLs shown, or build them manually:

#### `DATABASE_URL` — Session pooler (for running the app)

- **Port:** `6543` (NOT 5432)
- **Username:** `postgres.[PROJECT-REF]` (e.g. `postgres.xutpjfamxgwsgyrbqztd`)
- **Host:** `aws-0-[REGION].pooler.supabase.com`

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### `DIRECT_URL` — Direct connection (for migrations only)

- **Port:** `5432`
- **Username:** `postgres` (plain — NOT `postgres.[PROJECT-REF]`)
- **Host:** `db.[PROJECT-REF].supabase.co`

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

> **Your error** (`pooler.supabase.com:5432` + `Schema engine error`) happens because port 5432 on the pooler host is **Transaction mode**, which Prisma migrations cannot use. Use port **6543** for the app and the **direct** host for migrations.

### Step 3: Update your `.env`

```env
DATABASE_URL="postgresql://postgres.xutpjfamxgwsgyrbqztd:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.xutpjfamxgwsgyrbqztd.supabase.co:5432/postgres?sslmode=require"
```

Replace `YOUR_PASSWORD` with your database password from project creation.

### Step 4: Run migrations + seed

```powershell
cd "F:\STORE TEST TASK"

# Validates URLs then migrates + seeds
npm run setup:supabase
```

Or manually:

```powershell
npx prisma migrate deploy
npx prisma db seed
```

If this works, your Supabase database is ready.

---

## Part 2 — Railway (Backend API)

### Step 1: Push code to GitHub

Railway deploys from Git. If you haven't already:

```powershell
cd "F:\STORE TEST TASK"
git init
git add .
git commit -m "WMS 3PL backend with Supabase support"
```

Create a repo on GitHub and push:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/wms-3pl.git
git branch -M main
git push -u origin main
```

### Step 2: Create a Railway project

1. Go to [https://railway.app](https://railway.app) and sign up / log in
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects Node.js

### Step 3: Configure the service

1. Click your service → **Settings**
2. Set **Root Directory** to `/` (project root, not `frontend/`)
3. **Build Command:** `npm run build` (auto from `railway.toml`)
4. **Start Command:** `npm run start:prod` (auto from `railway.toml`)

### Step 4: Add environment variables

Go to **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Session pooler URL (port **6543**, `?pgbouncer=true`) |
| `DIRECT_URL` | Direct URL (port **5432**, username `postgres`) |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (add after Vercel deploy) |
| `API_URL` | `https://your-app.up.railway.app` (your Railway public URL) |

Railway sets `PORT` automatically — do not override it.

### Step 5: Deploy

1. Railway builds and deploys automatically on push
2. Go to **Settings** → **Networking** → **Generate Domain**
3. Copy your public URL, e.g. `https://wms-3pl-production.up.railway.app`

### Step 6: Run migrations and seed (first deploy only)

After the first successful deploy, seed the database:

**Option A — Railway CLI (recommended)**

```powershell
npm install -g @railway/cli
railway login
railway link          # select your project
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

**Option B — Local with Supabase URL**

```powershell
# Use same DATABASE_URL as Railway
npx prisma migrate deploy
npx prisma db seed
```

### Step 7: Verify backend

Open in browser:

- `https://YOUR-RAILWAY-URL.up.railway.app/health` → `{ "status": "ok" }`
- `https://YOUR-RAILWAY-URL.up.railway.app/api/docs` → Swagger UI
- `https://YOUR-RAILWAY-URL.up.railway.app/api/config/seed-info` → seed data JSON

---

## Part 3 — Vercel (Frontend)

### Step 1: Create a Vercel project

1. Go to [https://vercel.com](https://vercel.com) and sign up / log in
2. Click **Add New** → **Project**
3. Import the same GitHub repository

### Step 2: Configure build settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Other |
| **Build Command** | `npm run build` |
| **Output Directory** | `.` (dot) |

### Step 3: Add environment variable

| Variable | Value |
|----------|-------|
| `API_URL` | Your Railway URL, e.g. `https://wms-3pl-production.up.railway.app` |

No trailing slash.

### Step 4: Deploy

Click **Deploy**. Vercel builds `config.js` with your Railway API URL baked in.

Copy your Vercel URL, e.g. `https://wms-3pl.vercel.app`

### Step 5: Update Railway CORS

Go back to Railway → **Variables** → set:

```
FRONTEND_URL=https://wms-3pl.vercel.app
```

Redeploy Railway (or it may auto-redeploy on variable change).

---

## Part 4 — Test the full stack

1. Open your **Vercel URL** in the browser
2. API Base URL should already show your Railway URL
3. Click **Load Seed IDs** — fetches from Railway `/api/config/seed-info`
4. Click **Use Client A**
5. Click **List Inventory** — should return stock data from Supabase
6. Click **Generate Invoice** — billing engine runs against live data
7. Click **Fill Client A Example** → **Execute Transfer** — writes to Supabase

---

## Environment variables summary

### Railway (backend)

```
DATABASE_URL=postgresql://postgres.xxx:password@...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres?sslmode=require
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
API_URL=https://your-app.up.railway.app
```

### Vercel (frontend)

```
API_URL=https://your-app.up.railway.app
```

### Local development

```powershell
# .env (project root)
DATABASE_URL="postgresql://..."   # Supabase URL
FRONTEND_URL="http://localhost:5173"
API_URL="http://localhost:3000"
PORT=3000
```

```powershell
# Terminal 1 — backend
npm run dev

# Terminal 2 — frontend (optional, open frontend/index.html or serve folder)
cd frontend
npx serve .
```

Or open `frontend/index.html` directly and set API Base URL to `http://localhost:3000`.

---

## Troubleshooting

### `Schema engine error` (empty message)

**Cause:** Using pooler on port `5432` (Transaction mode) for migrations.

**Fix:**
1. Set `DATABASE_URL` to Session pooler port **6543** with `?pgbouncer=true`
2. Set `DIRECT_URL` to direct host `db.[REF].supabase.co` port **5432**
3. Ensure `prisma/schema.prisma` has `directUrl = env("DIRECT_URL")`
4. Run `npm run setup:supabase`

### `P1001: Can't reach database server`

**Causes & fixes:**
1. **Project paused** — open Supabase dashboard, click **Restore project**
2. **Wrong password** — reset in Supabase → Settings → Database → Reset password
3. **Wrong username on DIRECT_URL** — must be `postgres`, not `postgres.[REF]`
4. **IPv6 issue (Windows)** — in Supabase → Connect → enable IPv4 add-on, or run migrations from Railway: `railway run npx prisma migrate deploy`

### `Schema engine error` / can't connect to database

- Check both `DATABASE_URL` and `DIRECT_URL` are set
- Use **Session pooler** URL (port `6543`) for `DATABASE_URL`, not port `5432` on pooler host
- Ensure Supabase project is not paused (free tier pauses after inactivity)

### CORS error in browser

- Set `FRONTEND_URL` on Railway to your exact Vercel URL (no trailing slash)
- Redeploy Railway after changing the variable
- Vercel preview URLs (`*.vercel.app`) are allowed automatically

### `NO_SEED_DATA` on Load Seed IDs

Run seed against Supabase:

```powershell
railway run npx prisma db seed
```

### Railway build fails

- Ensure `Root Directory` is `/` (not `frontend`)
- Check build logs for Prisma errors
- `postinstall` runs `prisma generate` automatically

### Vercel shows wrong API URL

- Check `API_URL` env var in Vercel project settings
- Redeploy Vercel after changing it (triggers rebuild of `config.js`)

### Prisma migrate fails on Supabase

Use the **Direct connection** string for `DIRECT_URL` (not the pooler):

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

Run migrations locally with both env vars set, or from Railway:

```powershell
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

---

## Deployment checklist

- [ ] Supabase project created, connection string copied
- [ ] Code pushed to GitHub
- [ ] Railway deployed with `DATABASE_URL`, `NODE_ENV`, `API_URL`
- [ ] Railway public domain generated
- [ ] `npx prisma migrate deploy` + `npx prisma db seed` run against Supabase
- [ ] `/health` and `/api/config/seed-info` work on Railway URL
- [ ] Vercel deployed from `frontend/` folder with `API_URL`
- [ ] `FRONTEND_URL` set on Railway to Vercel URL
- [ ] Test UI loads seed data and calls APIs successfully

---

## Cost (free tiers)

| Service | Free tier |
|---------|-----------|
| Supabase | 2 free projects, 500 MB database |
| Railway | $5 free credit/month (enough for a small API) |
| Vercel | Free hobby plan for personal projects |

All three are sufficient for this test task submission.

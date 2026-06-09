# How to Connect Vercel + Railway + Supabase

## The 3 services

```
Vercel (frontend)  ──API_URL──▶  Railway (backend)  ──DATABASE_URL──▶  Supabase
```

There are **no API keys** between Vercel and Railway. You connect them with **URLs** and **environment variables**.

---

## Railway — fix the build error

Your build failed because Railway was building from the **repo root** (no `package.json` there).

### Fix (choose ONE)

**Option A — Use Dockerfile (recommended, already added)**

1. Railway → your service → **Settings**
2. **Root Directory** → leave empty `/` (repo root)
3. **Builder** → should auto-detect `Dockerfile` at root
4. Push the latest code to GitHub → Railway redeploys

**Option B — Set root directory to backend**

1. Railway → **Settings** → **Root Directory** → `backend`
2. Redeploy

---

## Environment variables

### Railway (backend) — Variables tab

| Variable | Where to get it | Example |
|----------|-----------------|---------|
| `DATABASE_URL` | Supabase → Connect → Prisma → **Session pooler** (port 6543) | `postgresql://postgres.xxx:pass@...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Supabase → Connect → Prisma → **Direct** (port 5432, user `postgres`) | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres?sslmode=require` |
| `NODE_ENV` | Set manually | `production` |
| `API_URL` | Railway → Settings → Networking → your public URL | `https://wms-test-production.up.railway.app` |
| `FRONTEND_URL` | Vercel → your deployed URL | `https://wms-test-cyan.vercel.app` |

Do **not** set `PORT` — Railway sets it automatically.

### Vercel (frontend) — Settings → Environment Variables

| Variable | Value |
|----------|-------|
| `API_URL` | Your Railway public URL (same as Railway `API_URL`) |

Example: `https://wms-test-production.up.railway.app`

**No trailing slash.** Without this variable, Vercel build will fail (by design).

After adding `API_URL`, click **Redeploy** on Vercel. The UI will then call Railway instead of `localhost:3006`.

---

## Step-by-step connection

### 1. Deploy Railway backend

1. Push code to GitHub (with the new `Dockerfile` at root)
2. Railway auto-redeploys
3. Add all Railway variables above
4. **Settings → Networking → Generate Domain**
5. Copy URL: `https://xxxx.up.railway.app`
6. Set `API_URL` on Railway to this URL
7. Test: open `https://xxxx.up.railway.app/health` → should show `{"status":"ok"}`

### 2. Seed Supabase

Railway **auto-seeds** on deploy when the `clients` table is empty (`scripts/seed-if-empty.ts`).

To seed manually:

```powershell
cd backend
npm run prisma:seed
```

Or from Railway CLI:

```powershell
railway run npx prisma db seed
```

### 3. Deploy Vercel frontend

1. Vercel → your project → **Settings → Environment Variables**
2. Add `API_URL` = your Railway URL
3. **Redeploy** (env vars only apply after redeploy)
4. Copy Vercel URL: `https://xxxx.vercel.app`

### 4. Connect CORS (Railway ↔ Vercel)

1. Railway → Variables → set `FRONTEND_URL` = your Vercel URL
2. Railway redeploys automatically

### 5. Test the connection

1. Open your **Vercel URL**
2. API Base URL should show your Railway URL
3. Click **Load Seed IDs** → calls `https://railway-url/api/config/seed-info`
4. Click **Use Client A** → **List Inventory**

---

## App headers (not platform keys)

The WMS API uses these headers for multi-tenant isolation (set automatically by the UI after Load Seed IDs):

| Header | Purpose |
|--------|---------|
| `x-client-id` | Tenant UUID (from seed data) |
| `x-user-id` | User UUID (from seed data) |

These are **not** Railway or Vercel keys — they come from your database seed.

---

## Quick checklist

- [ ] Railway build succeeds (Dockerfile at repo root)
- [ ] Railway `/health` returns OK
- [ ] Railway `/api/config/seed-info` returns client IDs
- [ ] Vercel has `API_URL` env var set
- [ ] Vercel redeployed after adding `API_URL`
- [ ] Railway has `FRONTEND_URL` = Vercel URL
- [ ] Test UI loads seed data and lists inventory

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Railway **healthcheck failed** | Push latest code — server now starts before migrate/seed. Redeploy. |
| `EPERM` on `npm run build` (Windows) | Stop `npm run dev` first (Ctrl+C), then build |
| Railway build fails at `prisma generate` | Push latest code (Dockerfile fix). Redeploy. |
| Railway build fails (general) | Ensure `Dockerfile` at repo root. Root Directory = `/` |
| CORS error in browser | Set `FRONTEND_URL` on Railway to exact Vercel URL |
| Load Seed IDs fails | Run `npm run prisma:seed` — check Railway `/api/config/seed-info` |
| 502 on Railway | Check Railway logs — usually missing `DATABASE_URL` |
| Vercel calls wrong API | Redeploy Vercel after setting `API_URL` |

# Run Online — Vercel + Railway + Supabase

Follow these steps **in order**. Your GitHub repo is: `vidhyutprayan6-dotcom/WMS-TEST`

---

## Why it failed before

| Problem | Cause | Fix |
|---------|-------|-----|
| Frontend local `npm serve` | Wrong command | Use `npm run dev` (see below) |
| Vercel `fsPath` error | Bad `vercel.json` config | Fixed — simplified `vercel.json` |
| Railway no deployment | No env vars + not clicked Deploy | Add variables + click Deploy |
| Railway build fail | Wrong root directory | Set Root Directory correctly |

---

## STEP 1 — Supabase (database)

1. [supabase.com](https://supabase.com) → your project
2. If paused → click **Restore**
3. **SQL Editor** → paste `backend/supabase/schema.sql` → **Run**
4. On your PC:

```powershell
cd backend
npm install
npm run prisma:seed
```

---

## STEP 2 — Railway (backend API)

### A. Service settings

Railway → **WMS-TEST** → **Settings**:

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Watch Paths** | (leave default) |

> Alternative: Root Directory = `/` (empty) uses root `Dockerfile`. **Use `backend`** — simpler.

### B. Add environment variables

Railway → **Variables** → **+ New Variable** → add ALL of these:

| Variable | Value (from your `backend/.env`) |
|----------|----------------------------------|
| `DATABASE_URL` | `postgresql://postgres.xutpjfamxgwsgyrbqztd:...@...pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | `postgresql://postgres:...@db.xutpjfamxgwsgyrbqztd.supabase.co:5432/postgres?sslmode=require` |
| `NODE_ENV` | `production` |
| `API_URL` | *(set after step C)* |
| `FRONTEND_URL` | *(set after step 4)* |

### C. Deploy

1. Click **Deploy** (purple button top-left — "Apply changes")
2. Wait for build to finish (green ✓)
3. **Settings → Networking → Generate Domain**
4. Copy URL: e.g. `https://wms-test-production.up.railway.app`
5. Go back to **Variables** → set `API_URL` = that URL
6. Click **Deploy** again

### D. Verify Railway

Open in browser:
- `https://YOUR-RAILWAY-URL/health` → `{"status":"ok"}`
- `https://YOUR-RAILWAY-URL/api/config/seed-info` → JSON data

---

## STEP 3 — Vercel (frontend UI)

### A. Project settings

Vercel → your project → **Settings → General**:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Other |
| **Build Command** | `npm run build` |
| **Output Directory** | `.` (a single dot) |
| **Install Command** | `npm install` |

### B. Environment variable

Vercel → **Settings → Environment Variables**:

| Name | Value | Environments |
|------|-------|--------------|
| `API_URL` | Your Railway URL (from Step 2C) | Production, Preview, Development |

Example: `https://wms-test-production.up.railway.app`

**No trailing slash.**

### C. Deploy

1. **Deployments** → **Redeploy** (or push to GitHub)
2. Wait for green ✓
3. Copy Vercel URL: e.g. `https://wms-test.vercel.app`

### D. Connect CORS

Railway → **Variables** → set:

```
FRONTEND_URL=https://wms-test.vercel.app
```

Click **Deploy** on Railway.

---

## STEP 4 — Test everything

1. Open **Vercel URL** in browser
2. API Base URL should show your Railway URL
3. Click **Load Seed IDs**
4. Click **Use Client A**
5. Click **List Inventory**

---

## Run locally (for testing)

### Terminal 1 — Backend

```powershell
cd backend
npm run dev
```

→ http://localhost:3000

### Terminal 2 — Frontend

```powershell
cd frontend
npm install
npm run dev
```

→ http://localhost:5173

> Do NOT use `npm serve` — use `npm run dev`

---

## Quick checklist

- [ ] Supabase tables created (`schema.sql` or `prisma:seed`)
- [ ] Railway Root Directory = `backend`
- [ ] Railway has 5 env vars (`DATABASE_URL`, `DIRECT_URL`, `NODE_ENV`, `API_URL`, `FRONTEND_URL`)
- [ ] Railway deployed + domain generated
- [ ] Railway `/health` works
- [ ] Vercel Root Directory = `frontend`
- [ ] Vercel has `API_URL` env var
- [ ] Vercel redeployed after adding `API_URL`
- [ ] Test UI works on Vercel URL

---

## Still stuck?

| Error | Fix |
|-------|-----|
| Vercel build fails | Check Root Directory = `frontend`, redeploy |
| Railway build fails | Check Root Directory = `backend`, check Deploy logs |
| Railway 502 | Missing `DATABASE_URL` in Variables |
| CORS error | Set `FRONTEND_URL` on Railway to exact Vercel URL |
| Load Seed IDs fails | Run `npm run prisma:seed` in backend folder |
| `npm serve` not found | Use `npm run dev` in frontend folder |

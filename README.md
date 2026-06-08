# 3PL/4PL Warehouse Management System — Backend

Production-grade mini WMS backend implementing **3PL Storage Billing**, **Inventory Transfer with Batch/Lot Traceability**, **Multi-Tenant Isolation**, and a complete **Audit Trail**.

**Deployment:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step Supabase + Railway + Vercel setup.

Built with Node.js, Express, TypeScript, Prisma, and SQLite (local) / PostgreSQL (Supabase) following **Clean Architecture** principles.

---

## Features

| Feature | Description |
|---------|-------------|
| **Storage Billing Engine** | Dynamic monthly invoices with pallet- or volume-based storage fees plus inbound/outbound handling line items |
| **Inventory Transfer** | Atomic bin-to-bin transfers with batch number and expiry date enforcement |
| **Multi-Tenant Isolation** | Every query scoped by `x-client-id` — Client A cannot access Client B data |
| **Audit Trail** | Full transaction log: who, when, before/after quantities |
| **Swagger Docs** | Interactive API documentation at `/api/docs` |

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** SQLite (local dev, zero setup) or PostgreSQL / Supabase (production)
- **Validation:** Zod
- **Documentation:** Swagger OpenAPI 3.0

---

## Project Structure

```
src/
├── modules/
│   ├── billing/       # Storage billing engine, invoice generation
│   ├── inventory/     # Transfer pipeline, stock listing
│   ├── audit/         # Audit log service
│   └── shared/
├── common/            # Errors, constants, utilities
├── middlewares/       # Tenant isolation, error handling
├── database/          # Prisma client
├── docs/              # Swagger configuration
├── app.ts
└── server.ts
```

### Architecture Layers

| Layer | Responsibility |
|-------|----------------|
| **Controllers** | HTTP request/response, DTO parsing |
| **Services** | Orchestration, transactions |
| **Domain** | Pure business logic (billing calculations, transfer validation) |
| **Repositories** | Database access only — all queries tenant-scoped |

---

## Installation

### Prerequisites

- Node.js 18+ only (no database server required for local testing)

### Quick Setup (recommended — SQLite)

Uses a local file database (`prisma/dev.db`). No PostgreSQL, Docker, or Supabase needed.

```bash
npm install
npm run setup    # creates database + seed data in one step
npm run dev      # start server
```

Then open **http://localhost:3000/** for the Test UI.

### Database options

| Option | When to use | Setup |
|--------|-------------|-------|
| **SQLite** (default) | Local testing, fastest start | `npm run setup` |
| **Supabase** | Cloud PostgreSQL for submission/demo | See below |
| **Docker Postgres** | If you have Docker installed | See below |

### Option A — SQLite (default, already configured)

Your `.env` should contain:

```
DATABASE_URL="file:./dev.db"
```

Run:

```bash
npm run setup
npm run dev
```

### Option B — Supabase (free cloud PostgreSQL)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string** (URI mode)
3. Copy the connection string and update `.env`:
   ```
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
   ```
4. In `prisma/schema.prisma`, change the provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Run `npm run setup`

### Option C — Docker PostgreSQL (optional)

Only if Docker Desktop is installed:

```bash
docker compose up -d
```

Then switch `prisma/schema.prisma` provider to `postgresql`, set `.env` to:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/wms_3pl?schema=public"
```

Run `npm run setup`.

### Manual setup (step by step)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (SQLite is pre-configured in .env.example)
copy .env.example .env

# 3. Migrate + seed in one command
npm run setup

# 4. Start development server
npm run dev
```

Server runs at `http://localhost:3000`  
**Test UI** at `http://localhost:3000/`  
Swagger UI at `http://localhost:3000/api/docs`

---

## Test UI (Quick Start)

A built-in browser UI lets you test all APIs without curl or Postman.

1. Start the server (`npm run dev`)
2. Open **http://localhost:3000/**
3. Click **Load Seed IDs** (requires `npx prisma db seed` first)
4. Click **Use Client A** to fill tenant headers automatically
5. Use the action buttons:
   - **List Inventory** — view stock for the tenant
   - **Generate Invoice** — create a monthly invoice
   - **Execute Transfer** — move stock between bins
   - **Audit Logs** — view the audit trail
6. Try **Edge Case Tests** for error handling (insufficient stock, same bin, missing headers)

Config (client ID, user ID, etc.) is saved in your browser localStorage.

---

## Multi-Tenant Isolation

Every protected endpoint requires two headers:

| Header | Purpose |
|--------|---------|
| `x-client-id` | Tenant UUID — all data queries filter by this |
| `x-user-id` | User UUID — recorded in audit trail and stock movements |

Client A's inventory, invoices, and audit logs are completely invisible to Client B.

---

## API Endpoints

### POST `/api/billing/generate`

Generate a monthly storage invoice.

**Headers:** `x-client-id`, `x-user-id`

```json
{
  "month": "2025-12"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "invoiceId": "uuid",
    "client": { "id": "...", "name": "Client A", "billingType": "PALLET" },
    "month": "2025-12",
    "lineItems": [
      { "description": "Monthly Storage (Pallet-based)", "quantity": 93, "rate": 2.5, "amount": 232.5 },
      { "description": "Inbound Handling Fees (Receiving)", "quantity": 100, "rate": 0.75, "amount": 75 },
      { "description": "Outbound Handling Fees (Picking/Packing)", "quantity": 30, "rate": 1.25, "amount": 37.5 }
    ],
    "totals": { "storage": 232.5, "inbound": 75, "outbound": 37.5, "grandTotal": 345 }
  }
}
```

### Billing Logic

| Client Type | Storage Formula |
|-------------|-----------------|
| **PALLET** | Occupied Pallets × Daily Rate × Days in Month |
| **VOLUME** | Volume (m³) × Daily Rate × Days in Month |

Inbound Fee = Received Qty × Inbound Rate  
Outbound Fee = Shipped Qty × Outbound Rate

---

### POST `/api/inventory/transfer`

Transfer stock between bins with batch/lot traceability.

```json
{
  "productId": "uuid",
  "fromBinId": "uuid",
  "toBinId": "uuid",
  "batchNumber": "LOT-001",
  "expiryDate": "2027-01-01",
  "quantity": 50
}
```

**Transfer flow (single transaction):**

1. Validate product belongs to tenant
2. Load source inventory (batch + expiry must match)
3. Validate available quantity
4. Validate destination bin capacity (pallets + m³)
5. Deduct from source
6. Create/update destination inventory
7. Record stock movement
8. Write audit log

---

### GET `/api/inventory`

List all inventory for the current tenant.

### GET `/api/invoices/:id`

Retrieve a generated invoice (tenant-scoped).

### GET `/api/audit-logs`

List audit trail entries for the current tenant.

---

## Edge Case Testing

After seeding, use the printed UUIDs from the console.

### Successful transfer (Client A)

```bash
curl -X POST http://localhost:3000/api/inventory/transfer \
  -H "Content-Type: application/json" \
  -H "x-client-id: <CLIENT_A_ID>" \
  -H "x-user-id: <USER_A_ID>" \
  -d '{
    "productId": "<PRODUCT_A1_ID>",
    "fromBinId": "<BIN_A1_ID>",
    "toBinId": "<BIN_A2_ID>",
    "batchNumber": "LOT-001",
    "expiryDate": "2027-01-01",
    "quantity": 20
  }'
```

### Insufficient stock

```bash
# Request quantity > available (100)
curl -X POST http://localhost:3000/api/inventory/transfer \
  -H "Content-Type: application/json" \
  -H "x-client-id: <CLIENT_A_ID>" \
  -H "x-user-id: <USER_A_ID>" \
  -d '{ "productId": "...", "fromBinId": "...", "toBinId": "...", "batchNumber": "LOT-001", "expiryDate": "2027-01-01", "quantity": 999 }'
```

Expected: `400 INSUFFICIENT_STOCK`

### Bin capacity exceeded

Transfer a large quantity to a nearly full bin.

Expected: `400 BIN_CAPACITY_EXCEEDED`

### Cross-tenant access

Use Client B's `x-client-id` with Client A's product ID.

Expected: `404 PRODUCT_NOT_FOUND`

### Generate invoice

```bash
curl -X POST http://localhost:3000/api/billing/generate \
  -H "Content-Type: application/json" \
  -H "x-client-id: <CLIENT_A_ID>" \
  -H "x-user-id: <USER_A_ID>" \
  -d '{ "month": "2025-12" }'
```

---

## Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "error": "INSUFFICIENT_STOCK",
  "message": "Requested quantity (999) exceeds available stock (100)."
}
```

| Code | HTTP | Scenario |
|------|------|----------|
| `TENANT_REQUIRED` | 400 | Missing `x-client-id` header |
| `INSUFFICIENT_STOCK` | 400 | Pick qty > available |
| `BIN_CAPACITY_EXCEEDED` | 400 | Destination bin over capacity |
| `PRODUCT_NOT_FOUND` | 404 | Product not in tenant |
| `INVENTORY_NOT_FOUND` | 404 | Batch/expiry/bin mismatch |
| `INVOICE_NOT_FOUND` | 404 | Invoice not found for tenant |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled production build |
| `npx prisma migrate dev` | Apply migrations |
| `npx prisma db seed` | Load sample data |

---

## License

MIT — Test task submission.

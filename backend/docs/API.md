# WMS 3PL — API Documentation (Client Submission)

## Live documentation

| Resource | URL |
|----------|-----|
| **Swagger UI** (interactive) | `https://YOUR-RAILWAY-URL/api/docs` |
| **OpenAPI JSON** (import to Postman) | `https://YOUR-RAILWAY-URL/api/docs/openapi.json` |
| **Test UI** | `https://YOUR-VERCEL-URL` |
| **Health check** | `https://YOUR-RAILWAY-URL/health` |

Local: replace with `http://localhost:3006`.

---

## Requirements mapping

### A. 3PL Storage Billing Engine

| Capability | Endpoint |
|------------|----------|
| Monthly invoice (pallet × daily rate OR volume M³) | `POST /api/billing/generate` |
| Inbound / outbound handling fee line items | Included in invoice `lineItems` |
| Retrieve saved invoice | `GET /api/invoices/:id` |

**Billing logic** (pure domain, no DB in engine): `backend/src/modules/billing/domain/billing.engine.ts`

### B. Stock Movement & Traceability

| Capability | Endpoint |
|------------|----------|
| Bin-to-bin transfer | `POST /api/inventory/transfer` |
| Batch/lot + expiry enforcement | Required fields on transfer body |
| Multi-tenant isolation | `x-client-id` header scopes all queries |
| List tenant stock | `GET /api/inventory` |

**Transfer logic** (pure domain): `backend/src/modules/inventory/domain/inventory.transfer.domain.ts`

### Quality & acceptance criteria

| Criterion | Implementation |
|-----------|----------------|
| **Clean Architecture** | `controllers → services → domain + repositories` per module under `backend/src/modules/` |
| **Audit trail** | `audit_logs` + `stock_movements` on every transfer; `GET /api/audit-logs` |
| **Error handling** | Domain validation + `error.middleware.ts`; never crashes, returns `{ error, message }` |
| **API documentation** | Swagger UI + this document + OpenAPI JSON export |

---

## Authentication headers

All protected endpoints require:

```http
x-client-id: <tenant-uuid>
x-user-id:   <operator-uuid>
Content-Type: application/json
```

Get UUIDs: `GET /api/config/seed-info` (no headers required).

---

## Endpoints

### 1. `GET /health`

No auth. Returns `{ "status": "ok", "service": "wms-3pl-backend" }`.

---

### 2. `GET /api/config/seed-info`

No auth. Returns test client/user/bin/product UUIDs and a sample transfer payload.

---

### 3. `POST /api/billing/generate`

**Requirement A** — Generate monthly invoice.

**Request:**
```json
{ "month": "2025-12" }
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "invoiceId": "uuid",
    "client": { "id": "...", "name": "Client A (Pallet)", "billingType": "PALLET" },
    "month": "2025-12",
    "lineItems": [
      { "description": "Storage (Pallet × daily rate × days)", "quantity": 62, "rate": 2.5, "amount": 155 },
      { "description": "Inbound handling", "quantity": 100, "rate": 0.75, "amount": 75 },
      { "description": "Outbound handling", "quantity": 30, "rate": 1.25, "amount": 37.5 }
    ],
    "totals": { "storage": 155, "inbound": 75, "outbound": 37.5, "grandTotal": 267.5 }
  }
}
```

---

### 4. `GET /api/invoices/:id`

**Requirement A** — Retrieve invoice by ID (tenant-scoped).

---

### 5. `GET /api/inventory`

**Requirement B** — List stock for current tenant only.

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productId": "uuid",
      "sku": "SKU-A-001",
      "productName": "Widget A",
      "binId": "uuid",
      "binCode": "A1",
      "batchNumber": "LOT-001",
      "expiryDate": "2027-01-01",
      "quantity": 100,
      "palletCount": 2,
      "volumeM3": 5.0
    }
  ]
}
```

---

### 6. `POST /api/inventory/transfer`

**Requirement B** — Execute bin-to-bin transfer with traceability.

**Request:**
```json
{
  "productId": "f1000001-0001-4000-8000-000000000001",
  "fromBinId": "e1000001-0001-4000-8000-000000000001",
  "toBinId": "e1000001-0001-4000-8000-000000000002",
  "batchNumber": "LOT-001",
  "expiryDate": "2027-01-01",
  "quantity": 20
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "movementId": "uuid",
    "fromBin": "A1",
    "toBin": "A2",
    "quantity": 20,
    "beforeQty": 100,
    "afterQty": 80,
    "performedBy": "user-uuid"
  }
}
```

Creates records in `stock_movements` and `audit_logs`.

---

### 7. `GET /api/audit-logs`

**Audit trail** — Who, when, before/after quantities.

**Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "TRANSFER",
      "performedBy": "user-uuid",
      "createdAt": "2025-12-15T10:30:00.000Z",
      "oldValue": { "beforeQty": 100, "movedQty": 20, "fromBin": "A1", "toBin": "A2" },
      "newValue": { "afterQty": 80, "movementId": "uuid" }
    }
  ]
}
```

---

## Error codes

All errors return:
```json
{ "success": false, "error": "CODE", "message": "Detail" }
```

| Code | HTTP | Scenario |
|------|------|----------|
| `TENANT_REQUIRED` | 400 | Missing `x-client-id` |
| `USER_REQUIRED` | 400 | Missing `x-user-id` |
| `VALIDATION_ERROR` | 400 | Invalid UUID, date, or body |
| `INSUFFICIENT_STOCK` | 400 | Transfer qty > available |
| `SAME_BIN_TRANSFER` | 400 | Source bin = destination bin |
| `BIN_CAPACITY_EXCEEDED` | 400 | Destination bin full |
| `TENANT_MISMATCH` | 403 | Body clientId ≠ header |
| `PRODUCT_NOT_FOUND` | 404 | Product not in tenant |
| `INVENTORY_NOT_FOUND` | 404 | No stock matching batch/expiry/bin |
| `INVOICE_NOT_FOUND` | 404 | Invoice ID not found |
| `BILLING_CONTEXT_NOT_FOUND` | 404 | Client or rates missing |

---

## Recommended test sequence (for client review)

1. `GET /api/config/seed-info` — copy UUIDs  
2. `GET /api/inventory` — verify tenant stock  
3. `POST /api/inventory/transfer` — successful move  
4. `GET /api/audit-logs` — verify who/when/before/after  
5. `POST /api/billing/generate` — invoice for `2025-12`  
6. `GET /api/invoices/:id` — retrieve invoice  
7. **Edge cases** (via Test UI): insufficient stock, same bin, missing tenant  

Or use the **Vercel Test UI** — each action shows a toast with the result.

---

## Architecture (Clean Architecture)

```
HTTP Request
    ↓
Controller     — validation (Zod), HTTP status, response shape
    ↓
Service        — orchestration, transactions
    ↓
Domain         — pure business rules (billing.engine, inventory.transfer.domain)
    ↓
Repository     — Prisma / database queries only
```

---

## Import into Postman

1. Open Postman → **Import** → **Link**
2. Paste: `https://YOUR-RAILWAY-URL/api/docs/openapi.json`
3. Set collection variables: `baseUrl`, `clientId`, `userId` from seed-info

Swagger alone satisfies the requirement (“Swagger **or** Postman Collection”).

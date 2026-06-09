# Database Schema — Client Requirements Mapping

## Requirement A: 3PL Storage Billing Engine

| Table | Purpose |
|-------|---------|
| `clients` | B2B tenant + `billingType` (PALLET or VOLUME) |
| `billing_rates` | Daily storage rate + inbound/outbound handling fees |
| `inventory` | Occupied pallets / volume (M³) for storage calculation |
| `stock_movements` | INBOUND / OUTBOUND quantities for handling fees |
| `invoices` | Monthly invoice header |
| `invoice_line_items` | Storage, inbound handling, outbound handling lines |

## Requirement B: Stock Movement & Traceability

| Table | Purpose |
|-------|---------|
| `clients` | Multi-tenant isolation (`clientId` on all stock) |
| `products` | SKU per tenant |
| `bins` | Source/destination locations + capacity limits |
| `inventory` | `batchNumber`, `expiryDate`, `quantity` |
| `stock_movements` | TRANSFER records with before/after qty |

## Quality Criteria

| Table | Purpose |
|-------|---------|
| `users` | Who performed the action (`x-user-id` header) |
| `audit_logs` | Who, when, initial quantity, final balance |
| `warehouses` | Groups bins (single site for test data) |

## Not included (out of scope)

- User roles / email auth
- Product unit volume (volume stored on inventory rows)
- Warehouse addresses
- Adjustment movement type

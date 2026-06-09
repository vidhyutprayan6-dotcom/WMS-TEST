-- STEP 2 — Minimal test data (2 tenants, 1 product each, billing movements)

TRUNCATE TABLE
  "invoice_line_items", "invoices", "audit_logs", "stock_movements",
  "inventory", "products", "billing_rates", "users", "bins", "warehouses", "clients"
RESTART IDENTITY CASCADE;

INSERT INTO "clients" ("id", "name", "billingType", "createdAt", "updatedAt") VALUES
  ('a1000001-0001-4000-8000-000000000001', 'Client A (Pallet)', 'PALLET', NOW(), NOW()),
  ('b1000001-0001-4000-8000-000000000002', 'Client B (Volume)', 'VOLUME', NOW(), NOW());

INSERT INTO "warehouses" ("id", "name", "createdAt", "updatedAt") VALUES
  ('d1000001-0001-4000-8000-000000000001', 'Warehouse A', NOW(), NOW());

INSERT INTO "bins" ("id", "warehouseId", "code", "capacityPallets", "capacityM3", "currentPallets", "currentM3", "createdAt", "updatedAt") VALUES
  ('e1000001-0001-4000-8000-000000000001', 'd1000001-0001-4000-8000-000000000001', 'A1', 50, 100, 2, 5.0, NOW(), NOW()),
  ('e1000001-0001-4000-8000-000000000002', 'd1000001-0001-4000-8000-000000000001', 'A2', 30, 60, 0, 0, NOW(), NOW()),
  ('e1000001-0001-4000-8000-000000000003', 'd1000001-0001-4000-8000-000000000001', 'B1', 20, 40, 3, 50.0, NOW(), NOW());

INSERT INTO "users" ("id", "clientId", "name", "createdAt", "updatedAt") VALUES
  ('c1000001-0001-4000-8000-000000000001', 'a1000001-0001-4000-8000-000000000001', 'Alice', NOW(), NOW()),
  ('c2000001-0001-4000-8000-000000000002', 'b1000001-0001-4000-8000-000000000002', 'Bob', NOW(), NOW());

INSERT INTO "billing_rates" ("id", "clientId", "storageRate", "inboundRate", "outboundRate", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'a1000001-0001-4000-8000-000000000001', 2.5, 0.75, 1.25, NOW(), NOW()),
  (gen_random_uuid()::text, 'b1000001-0001-4000-8000-000000000002', 0.15, 0.5, 0.9, NOW(), NOW());

INSERT INTO "products" ("id", "clientId", "sku", "name", "createdAt", "updatedAt") VALUES
  ('f1000001-0001-4000-8000-000000000001', 'a1000001-0001-4000-8000-000000000001', 'SKU-A-001', 'Widget A', NOW(), NOW()),
  ('f2000001-0001-4000-8000-000000000002', 'b1000001-0001-4000-8000-000000000002', 'SKU-B-001', 'Commodity B', NOW(), NOW());

INSERT INTO "inventory" ("id", "clientId", "productId", "binId", "batchNumber", "expiryDate", "quantity", "palletCount", "volumeM3", "createdAt", "updatedAt") VALUES
  ('11000001-0001-4000-8000-000000000001', 'a1000001-0001-4000-8000-000000000001', 'f1000001-0001-4000-8000-000000000001', 'e1000001-0001-4000-8000-000000000001', 'LOT-001', '2027-01-01', 100, 2, 5.0, NOW(), NOW()),
  ('11000001-0001-4000-8000-000000000003', 'b1000001-0001-4000-8000-000000000002', 'f2000001-0001-4000-8000-000000000002', 'e1000001-0001-4000-8000-000000000003', 'LOT-B-001', '2028-03-20', 500, 3, 50.0, NOW(), NOW());

INSERT INTO "stock_movements" ("id", "clientId", "productId", "fromBinId", "toBinId", "batchNumber", "expiryDate", "quantity", "beforeQty", "afterQty", "movedBy", "movementType", "createdAt") VALUES
  (gen_random_uuid()::text, 'a1000001-0001-4000-8000-000000000001', 'f1000001-0001-4000-8000-000000000001', NULL, 'e1000001-0001-4000-8000-000000000001', 'LOT-001', '2027-01-01', 100, 0, 100, 'c1000001-0001-4000-8000-000000000001', 'INBOUND', '2025-12-01'),
  (gen_random_uuid()::text, 'a1000001-0001-4000-8000-000000000001', 'f1000001-0001-4000-8000-000000000001', 'e1000001-0001-4000-8000-000000000001', NULL, 'LOT-001', '2027-01-01', 30, 100, 70, 'c1000001-0001-4000-8000-000000000001', 'OUTBOUND', '2025-12-15'),
  (gen_random_uuid()::text, 'b1000001-0001-4000-8000-000000000002', 'f2000001-0001-4000-8000-000000000002', NULL, 'e1000001-0001-4000-8000-000000000003', 'LOT-B-001', '2028-03-20', 500, 0, 500, 'c2000001-0001-4000-8000-000000000002', 'INBOUND', '2025-12-01');

SELECT 'Client A' AS tenant, 'a1000001-0001-4000-8000-000000000001' AS client_id, 'c1000001-0001-4000-8000-000000000001' AS user_id
UNION ALL SELECT 'Client B', 'b1000001-0001-4000-8000-000000000002', 'c2000001-0001-4000-8000-000000000002';

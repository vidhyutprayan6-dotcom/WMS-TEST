-- Align schema to client requirements (minimal fields only)

-- Users: drop email/role (audit uses user id + name)
DROP INDEX IF EXISTS "users_email_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "email";
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
DROP TYPE IF EXISTS "UserRole";

-- Warehouses: drop address
ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "address";

-- Products: drop unitVolume (volume tracked on inventory)
ALTER TABLE "products" DROP COLUMN IF EXISTS "unitVolume";

-- Inventory: warehouse derived from bin
ALTER TABLE "inventory" DROP CONSTRAINT IF EXISTS "inventory_warehouseId_fkey";
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "warehouseId";

import { PrismaClient, BillingType, MovementType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database (minimal test data)...');

  await prisma.auditLog.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.billingRate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.bin.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.client.deleteMany();

  // Two tenants — multi-tenant isolation demo
  const clientA = await prisma.client.create({
    data: { name: 'Client A (Pallet)', billingType: BillingType.PALLET },
  });
  const clientB = await prisma.client.create({
    data: { name: 'Client B (Volume)', billingType: BillingType.VOLUME },
  });

  const warehouse = await prisma.warehouse.create({
    data: { name: 'Warehouse A' },
  });

  const binA1 = await prisma.bin.create({
    data: { warehouseId: warehouse.id, code: 'A1', capacityPallets: 50, capacityM3: 100, currentPallets: 2, currentM3: 5.0 },
  });
  const binA2 = await prisma.bin.create({
    data: { warehouseId: warehouse.id, code: 'A2', capacityPallets: 30, capacityM3: 60, currentPallets: 0, currentM3: 0 },
  });
  const binB1 = await prisma.bin.create({
    data: { warehouseId: warehouse.id, code: 'B1', capacityPallets: 20, capacityM3: 40, currentPallets: 3, currentM3: 50.0 },
  });

  const userA = await prisma.user.create({
    data: { clientId: clientA.id, name: 'Alice' },
  });
  const userB = await prisma.user.create({
    data: { clientId: clientB.id, name: 'Bob' },
  });

  await prisma.billingRate.create({
    data: { clientId: clientA.id, storageRate: 2.5, inboundRate: 0.75, outboundRate: 1.25 },
  });
  await prisma.billingRate.create({
    data: { clientId: clientB.id, storageRate: 0.15, inboundRate: 0.5, outboundRate: 0.9 },
  });

  const productA = await prisma.product.create({
    data: { clientId: clientA.id, sku: 'SKU-A-001', name: 'Widget A' },
  });
  const productB = await prisma.product.create({
    data: { clientId: clientB.id, sku: 'SKU-B-001', name: 'Commodity B' },
  });

  await prisma.inventory.create({
    data: {
      clientId: clientA.id,
      productId: productA.id,
      binId: binA1.id,
      batchNumber: 'LOT-001',
      expiryDate: new Date('2027-01-01'),
      quantity: 100,
      palletCount: 2,
      volumeM3: 5.0,
    },
  });
  await prisma.inventory.create({
    data: {
      clientId: clientB.id,
      productId: productB.id,
      binId: binB1.id,
      batchNumber: 'LOT-B-001',
      expiryDate: new Date('2028-03-20'),
      quantity: 500,
      palletCount: 3,
      volumeM3: 50.0,
    },
  });

  // Inbound/outbound for December 2025 billing demo
  await prisma.stockMovement.createMany({
    data: [
      {
        clientId: clientA.id,
        productId: productA.id,
        toBinId: binA1.id,
        batchNumber: 'LOT-001',
        expiryDate: new Date('2027-01-01'),
        quantity: 100,
        beforeQty: 0,
        afterQty: 100,
        movedBy: userA.id,
        movementType: MovementType.INBOUND,
        createdAt: new Date('2025-12-01'),
      },
      {
        clientId: clientA.id,
        productId: productA.id,
        fromBinId: binA1.id,
        batchNumber: 'LOT-001',
        expiryDate: new Date('2027-01-01'),
        quantity: 30,
        beforeQty: 100,
        afterQty: 70,
        movedBy: userA.id,
        movementType: MovementType.OUTBOUND,
        createdAt: new Date('2025-12-15'),
      },
      {
        clientId: clientB.id,
        productId: productB.id,
        toBinId: binB1.id,
        batchNumber: 'LOT-B-001',
        expiryDate: new Date('2028-03-20'),
        quantity: 500,
        beforeQty: 0,
        afterQty: 500,
        movedBy: userB.id,
        movementType: MovementType.INBOUND,
        createdAt: new Date('2025-12-01'),
      },
    ],
  });

  const seedInfo = {
    generatedAt: new Date().toISOString(),
    source: 'database',
    dbConnected: true,
    clients: {
      clientA: { id: clientA.id, name: clientA.name, billingType: clientA.billingType, userId: userA.id, userName: userA.name },
      clientB: { id: clientB.id, name: clientB.name, billingType: clientB.billingType, userId: userB.id, userName: userB.name },
    },
    warehouse: { id: warehouse.id, name: warehouse.name },
    bins: { A1: binA1.id, A2: binA2.id, B1: binB1.id },
    products: { clientA: productA.id, clientB: productB.id },
    examples: {
      clientATransfer: {
        productId: productA.id,
        fromBinId: binA1.id,
        toBinId: binA2.id,
        batchNumber: 'LOT-001',
        expiryDate: '2027-01-01',
        quantity: 20,
      },
    },
  };

  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'seed-fallback.json'), JSON.stringify(seedInfo, null, 2));

  console.log('Seed complete.');
  console.log('Client A:', clientA.id, '| User:', userA.id);
  console.log('Client B:', clientB.id, '| User:', userB.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

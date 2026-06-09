import { PrismaClient, BillingType, UserRole, MovementType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

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

  const clientA = await prisma.client.create({
    data: { name: 'Client A — Pallet Billing', billingType: BillingType.PALLET },
  });

  const clientB = await prisma.client.create({
    data: { name: 'Client B — Volume Billing', billingType: BillingType.VOLUME },
  });

  const warehouse = await prisma.warehouse.create({
    data: { name: 'Warehouse A', address: '100 Logistics Park, Industrial Zone' },
  });

  const binA1 = await prisma.bin.create({
    data: {
      warehouseId: warehouse.id,
      code: 'A1',
      capacityPallets: 50,
      capacityM3: 100,
      currentPallets: 2,
      currentM3: 4.5,
    },
  });

  const binA2 = await prisma.bin.create({
    data: {
      warehouseId: warehouse.id,
      code: 'A2',
      capacityPallets: 30,
      capacityM3: 60,
      currentPallets: 1,
      currentM3: 2.0,
    },
  });

  const binB1 = await prisma.bin.create({
    data: {
      warehouseId: warehouse.id,
      code: 'B1',
      capacityPallets: 20,
      capacityM3: 40,
      currentPallets: 0,
      currentM3: 0,
    },
  });

  const userA = await prisma.user.create({
    data: {
      clientId: clientA.id,
      name: 'Alice Operator',
      email: 'alice@clienta.com',
      role: UserRole.OPERATOR,
    },
  });

  const userB = await prisma.user.create({
    data: {
      clientId: clientB.id,
      name: 'Bob Supervisor',
      email: 'bob@clientb.com',
      role: UserRole.SUPERVISOR,
    },
  });

  await prisma.billingRate.create({
    data: {
      clientId: clientA.id,
      storageRate: 2.5,
      inboundRate: 0.75,
      outboundRate: 1.25,
    },
  });

  await prisma.billingRate.create({
    data: {
      clientId: clientB.id,
      storageRate: 0.15,
      inboundRate: 0.5,
      outboundRate: 0.9,
    },
  });

  const productA1 = await prisma.product.create({
    data: {
      clientId: clientA.id,
      sku: 'SKU-A-001',
      name: 'Premium Widget',
      unitVolume: 0.05,
    },
  });

  const productA2 = await prisma.product.create({
    data: {
      clientId: clientA.id,
      sku: 'SKU-A-002',
      name: 'Standard Gadget',
      unitVolume: 0.03,
    },
  });

  const productB1 = await prisma.product.create({
    data: {
      clientId: clientB.id,
      sku: 'SKU-B-001',
      name: 'Bulk Commodity',
      unitVolume: 0.1,
    },
  });

  await prisma.inventory.create({
    data: {
      clientId: clientA.id,
      productId: productA1.id,
      warehouseId: warehouse.id,
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
      clientId: clientA.id,
      productId: productA2.id,
      warehouseId: warehouse.id,
      binId: binA2.id,
      batchNumber: 'LOT-002',
      expiryDate: new Date('2026-06-15'),
      quantity: 200,
      palletCount: 1,
      volumeM3: 6.0,
    },
  });

  await prisma.inventory.create({
    data: {
      clientId: clientB.id,
      productId: productB1.id,
      warehouseId: warehouse.id,
      binId: binB1.id,
      batchNumber: 'LOT-B-001',
      expiryDate: new Date('2028-03-20'),
      quantity: 500,
      palletCount: 3,
      volumeM3: 50.0,
    },
  });

  const monthStart = new Date('2025-12-01');
  const monthEnd = new Date('2025-12-15');

  await prisma.stockMovement.createMany({
    data: [
      {
        clientId: clientA.id,
        productId: productA1.id,
        toBinId: binA1.id,
        batchNumber: 'LOT-001',
        expiryDate: new Date('2027-01-01'),
        quantity: 100,
        beforeQty: 0,
        afterQty: 100,
        movedBy: userA.id,
        movementType: MovementType.INBOUND,
        createdAt: monthStart,
      },
      {
        clientId: clientA.id,
        productId: productA1.id,
        fromBinId: binA1.id,
        batchNumber: 'LOT-001',
        expiryDate: new Date('2027-01-01'),
        quantity: 30,
        beforeQty: 100,
        afterQty: 70,
        movedBy: userA.id,
        movementType: MovementType.OUTBOUND,
        createdAt: monthEnd,
      },
      {
        clientId: clientB.id,
        productId: productB1.id,
        toBinId: binB1.id,
        batchNumber: 'LOT-B-001',
        expiryDate: new Date('2028-03-20'),
        quantity: 500,
        beforeQty: 0,
        afterQty: 500,
        movedBy: userB.id,
        movementType: MovementType.INBOUND,
        createdAt: monthStart,
      },
    ],
  });

  console.log('\n=== Seed complete ===\n');
  console.log('Client A (Pallet billing):', clientA.id);
  console.log('Client B (Volume billing):', clientB.id);
  console.log('User A (Client A operator):', userA.id);
  console.log('User B (Client B supervisor):', userB.id);
  console.log('Warehouse:', warehouse.id);
  console.log('Bin A1:', binA1.id);
  console.log('Bin A2:', binA2.id);
  console.log('Bin B1:', binB1.id);
  console.log('Product A1 (Premium Widget):', productA1.id);
  console.log('Product A2 (Standard Gadget):', productA2.id);
  console.log('Product B1 (Bulk Commodity):', productB1.id);
  console.log('\nUse these IDs in API requests with x-client-id and x-user-id headers.');
  console.log('Test UI (local):  open frontend/index.html');
  console.log('Seed info API:    GET /api/config/seed-info');

  const seedInfo = {
    generatedAt: new Date().toISOString(),
    source: 'database',
    dbConnected: true,
    clients: {
      clientA: {
        id: clientA.id,
        name: clientA.name,
        billingType: clientA.billingType,
        userId: userA.id,
        userName: userA.name,
      },
      clientB: {
        id: clientB.id,
        name: clientB.name,
        billingType: clientB.billingType,
        userId: userB.id,
        userName: userB.name,
      },
    },
    warehouse: { id: warehouse.id, name: warehouse.name },
    bins: { A1: binA1.id, A2: binA2.id, B1: binB1.id },
    products: { clientA1: productA1.id, clientA2: productA2.id, clientB1: productB1.id },
    examples: {
      clientATransfer: {
        productId: productA1.id,
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
  console.log('Wrote data/seed-fallback.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

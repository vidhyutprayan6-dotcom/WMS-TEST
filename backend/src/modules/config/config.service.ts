import fs from 'fs';
import path from 'path';
import prisma from '../../database/prisma';
import { useDemoStore } from '../../database/connection';
import { demoStore } from '../../demo/demo-store';
import { NotFoundError } from '../../common/errors/AppError';

function loadStaticSeedFallback() {
  const fallbackPath = path.join(process.cwd(), 'data', 'seed-fallback.json');
  if (!fs.existsSync(fallbackPath)) return null;
  return JSON.parse(fs.readFileSync(fallbackPath, 'utf-8')) as Record<string, unknown>;
}

export class ConfigService {
  async getSeedInfo() {
    if (await useDemoStore()) {
      return demoStore.getSeedInfo();
    }

    try {
      return await this.getSeedInfoFromDb();
    } catch (error) {
      console.error('Database error for seed-info:', error);
      if (process.env.NODE_ENV === 'production') throw error;
      return demoStore.getSeedInfo();
    }
  }

  private async getSeedInfoFromDb() {
    const clients = await prisma.client.findMany({
      include: {
        users: { take: 1, orderBy: { createdAt: 'asc' } },
        products: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (clients.length === 0) {
      const fallback = loadStaticSeedFallback();
      if (fallback) return { ...fallback, source: 'static-fallback' };
      throw new NotFoundError('NO_SEED_DATA', 'Database has no seed data. Run: npm run prisma:seed');
    }

    const warehouse = await prisma.warehouse.findFirst({
      include: { bins: { orderBy: { code: 'asc' } } },
    });

    if (!warehouse) {
      throw new NotFoundError('NO_WAREHOUSE', 'No warehouse found in database.');
    }

    const clientA = clients.find((c) => c.billingType === 'PALLET') ?? clients[0];
    const clientB = clients.find((c) => c.billingType === 'VOLUME') ?? clients[1];

    const productA1 = clientA.products.find((p) => p.sku === 'SKU-A-001') ?? clientA.products[0];
    const binA1 = warehouse.bins.find((b) => b.code === 'A1') ?? warehouse.bins[0];
    const binA2 = warehouse.bins.find((b) => b.code === 'A2') ?? warehouse.bins[1];
    const binB1 = warehouse.bins.find((b) => b.code === 'B1') ?? warehouse.bins[2];

    const userA = clientA.users[0];
    const userB = clientB?.users[0];

    return {
      generatedAt: new Date().toISOString(),
      source: 'database',
      dbConnected: true,
      clients: {
        clientA: {
          id: clientA.id,
          name: clientA.name,
          billingType: clientA.billingType,
          userId: userA?.id ?? '',
          userName: userA?.name ?? '',
        },
        ...(clientB && userB
          ? {
              clientB: {
                id: clientB.id,
                name: clientB.name,
                billingType: clientB.billingType,
                userId: userB.id,
                userName: userB.name,
              },
            }
          : {}),
      },
      warehouse: { id: warehouse.id, name: warehouse.name },
      bins: { A1: binA1?.id, A2: binA2?.id, B1: binB1?.id },
      products: { clientA1: productA1?.id },
      examples: {
        clientATransfer: productA1 && binA1 && binA2
          ? {
              productId: productA1.id,
              fromBinId: binA1.id,
              toBinId: binA2.id,
              batchNumber: 'LOT-001',
              expiryDate: '2027-01-01',
              quantity: 20,
            }
          : null,
      },
    };
  }
}

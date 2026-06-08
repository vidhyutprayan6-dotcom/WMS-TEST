import prisma from '../../../database/prisma';
import { BillingType, Client, Invoice, MovementType } from '@prisma/client';
import { getMonthDateRange } from '../../../common/utils/date.utils';

export interface BillingContext {
  client: Client;
  billingRate: {
    storageRate: number;
    inboundRate: number;
    outboundRate: number;
  };
  occupiedPallets: number;
  volumeM3: number;
  inboundQuantity: number;
  outboundQuantity: number;
}

export class BillingRepository {
  async getClient(clientId: string): Promise<Client | null> {
    return prisma.client.findUnique({ where: { id: clientId } });
  }

  async getBillingRate(clientId: string) {
    return prisma.billingRate.findUnique({ where: { clientId } });
  }

  async getStorageSnapshot(clientId: string): Promise<{ occupiedPallets: number; volumeM3: number }> {
    const aggregates = await prisma.inventory.aggregate({
      where: { clientId },
      _sum: { palletCount: true, volumeM3: true },
    });

    return {
      occupiedPallets: aggregates._sum.palletCount ?? 0,
      volumeM3: aggregates._sum.volumeM3 ?? 0,
    };
  }

  async getMovementQuantities(
    clientId: string,
    month: string
  ): Promise<{ inboundQuantity: number; outboundQuantity: number }> {
    const { start, end } = getMonthDateRange(month);

    const movements = await prisma.stockMovement.groupBy({
      by: ['movementType'],
      where: {
        clientId,
        createdAt: { gte: start, lte: end },
        movementType: { in: [MovementType.INBOUND, MovementType.OUTBOUND] },
      },
      _sum: { quantity: true },
    });

    const inbound = movements.find((m) => m.movementType === MovementType.INBOUND)?._sum.quantity ?? 0;
    const outbound = movements.find((m) => m.movementType === MovementType.OUTBOUND)?._sum.quantity ?? 0;

    return { inboundQuantity: inbound, outboundQuantity: outbound };
  }

  async getBillingContext(clientId: string, month: string): Promise<BillingContext | null> {
    const client = await this.getClient(clientId);
    if (!client) return null;

    const billingRate = await this.getBillingRate(clientId);
    if (!billingRate) return null;

    const storage = await this.getStorageSnapshot(clientId);
    const movements = await this.getMovementQuantities(clientId, month);

    return {
      client,
      billingRate,
      occupiedPallets: storage.occupiedPallets,
      volumeM3: storage.volumeM3,
      inboundQuantity: movements.inboundQuantity,
      outboundQuantity: movements.outboundQuantity,
    };
  }

  async saveInvoice(
    clientId: string,
    month: string,
    totals: { storage: number; inbound: number; outbound: number; grandTotal: number },
    lineItems: { description: string; quantity: number; rate: number; amount: number }[]
  ): Promise<Invoice & { lineItems: { id: string; description: string; quantity: number; rate: number; amount: number }[] }> {
    return prisma.invoice.upsert({
      where: { clientId_invoiceMonth: { clientId, invoiceMonth: month } },
      update: {
        storageTotal: totals.storage,
        inboundTotal: totals.inbound,
        outboundTotal: totals.outbound,
        grandTotal: totals.grandTotal,
        lineItems: {
          deleteMany: {},
          create: lineItems,
        },
      },
      create: {
        clientId,
        invoiceMonth: month,
        storageTotal: totals.storage,
        inboundTotal: totals.inbound,
        outboundTotal: totals.outbound,
        grandTotal: totals.grandTotal,
        lineItems: { create: lineItems },
      },
      include: { lineItems: true },
    });
  }

  async getInvoiceById(invoiceId: string, clientId: string) {
    return prisma.invoice.findFirst({
      where: { id: invoiceId, clientId },
      include: {
        lineItems: true,
        client: { select: { id: true, name: true, billingType: true } },
      },
    });
  }
}

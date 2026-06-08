import prisma from '../../../database/prisma';
import { Inventory, Prisma } from '@prisma/client';

export class InventoryRepository {
  async findByTenant(clientId: string): Promise<(Inventory & { product: { sku: string; name: string }; bin: { code: string } })[]> {
    return prisma.inventory.findMany({
      where: { clientId },
      include: {
        product: { select: { sku: true, name: true } },
        bin: { select: { code: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findProductForTenant(productId: string, clientId: string) {
    return prisma.product.findFirst({ where: { id: productId, clientId } });
  }

  async findSourceInventory(
    clientId: string,
    productId: string,
    binId: string,
    batchNumber: string,
    expiryDate: Date
  ) {
    return prisma.inventory.findFirst({
      where: { clientId, productId, binId, batchNumber, expiryDate },
      include: { bin: true, product: true },
    });
  }

  async findBin(binId: string) {
    return prisma.bin.findUnique({ where: { id: binId } });
  }

  async findDestinationInventory(
    clientId: string,
    productId: string,
    binId: string,
    batchNumber: string,
    expiryDate: Date,
    tx: Prisma.TransactionClient
  ) {
    return tx.inventory.findFirst({
      where: { clientId, productId, binId, batchNumber, expiryDate },
    });
  }

  async updateSourceInventory(
    inventoryId: string,
    newQty: number,
    newPallets: number,
    newVolumeM3: number,
    tx: Prisma.TransactionClient
  ) {
    if (newQty === 0) {
      return tx.inventory.delete({ where: { id: inventoryId } });
    }
    return tx.inventory.update({
      where: { id: inventoryId },
      data: { quantity: newQty, palletCount: newPallets, volumeM3: newVolumeM3 },
    });
  }

  async upsertDestinationInventory(
    data: {
      clientId: string;
      productId: string;
      warehouseId: string;
      binId: string;
      batchNumber: string;
      expiryDate: Date;
      quantity: number;
      palletCount: number;
      volumeM3: number;
    },
    tx: Prisma.TransactionClient
  ) {
    const existing = await this.findDestinationInventory(
      data.clientId,
      data.productId,
      data.binId,
      data.batchNumber,
      data.expiryDate,
      tx
    );

    if (existing) {
      return tx.inventory.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + data.quantity,
          palletCount: existing.palletCount + data.palletCount,
          volumeM3: existing.volumeM3 + data.volumeM3,
        },
      });
    }

    return tx.inventory.create({ data });
  }

  async updateBinUtilization(
    binId: string,
    palletDelta: number,
    m3Delta: number,
    tx: Prisma.TransactionClient
  ) {
    const bin = await tx.bin.findUniqueOrThrow({ where: { id: binId } });
    return tx.bin.update({
      where: { id: binId },
      data: {
        currentPallets: bin.currentPallets + palletDelta,
        currentM3: bin.currentM3 + m3Delta,
      },
    });
  }

  async createStockMovement(
    data: {
      clientId: string;
      productId: string;
      fromBinId: string;
      toBinId: string;
      batchNumber: string;
      expiryDate: Date;
      quantity: number;
      beforeQty: number;
      afterQty: number;
      movedBy: string;
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.stockMovement.create({
      data: { ...data, movementType: 'TRANSFER' },
    });
  }
}

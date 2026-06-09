import prisma from '../../../database/prisma';
import { isDatabaseAvailable } from '../../../database/connection';
import { demoStore } from '../../../demo/demo-store';
import { InventoryRepository } from '../repositories/inventory.repository';
import { InventoryTransferDomain } from '../domain/inventory.transfer.domain';
import { AuditService } from '../../audit/services/audit.service';
import { TransferInventoryDto } from '../dto/inventory.dto';
import { NotFoundError } from '../../../common/errors/AppError';

export class TransferInventoryService {
  private readonly transferDomain = new InventoryTransferDomain();

  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly auditService: AuditService
  ) {}

  async execute(clientId: string, userId: string, dto: TransferInventoryDto) {
    if (!(await isDatabaseAvailable())) {
      return demoStore.transfer(clientId, userId, dto);
    }

    const expiryDate = new Date(dto.expiryDate);

    const product = await this.inventoryRepository.findProductForTenant(dto.productId, clientId);
    if (!product) {
      throw new NotFoundError(
        'PRODUCT_NOT_FOUND',
        'Product not found or does not belong to the current tenant.'
      );
    }

    const sourceInventory = await this.inventoryRepository.findSourceInventory(
      clientId,
      dto.productId,
      dto.fromBinId,
      dto.batchNumber,
      expiryDate
    );

    if (!sourceInventory) {
      throw new NotFoundError(
        'INVENTORY_NOT_FOUND',
        'No inventory found matching product, bin, batch number, and expiry date.'
      );
    }

    const destBin = await this.inventoryRepository.findBin(dto.toBinId);
    if (!destBin) {
      throw new NotFoundError('BIN_NOT_FOUND', 'Destination bin not found.');
    }

    const { transferPallets, transferM3 } = this.transferDomain.computeTransferFootprint(
      sourceInventory.quantity,
      sourceInventory.palletCount,
      sourceInventory.volumeM3,
      dto.quantity
    );

    this.transferDomain.validateTransfer({
      sourceQuantity: sourceInventory.quantity,
      requestedQuantity: dto.quantity,
      destCurrentPallets: destBin.currentPallets,
      destCurrentM3: destBin.currentM3,
      destCapacityPallets: destBin.capacityPallets,
      destCapacityM3: destBin.capacityM3,
      transferPallets,
      transferM3,
      fromBinId: dto.fromBinId,
      toBinId: dto.toBinId,
    });

    const beforeQty = sourceInventory.quantity;
    const afterQty = beforeQty - dto.quantity;

    const sourceRemainingPallets = Math.max(0, sourceInventory.palletCount - transferPallets);
    const sourceRemainingM3 = Math.max(0, sourceInventory.volumeM3 - transferM3);

    const result = await prisma.$transaction(async (tx) => {
      await this.inventoryRepository.updateSourceInventory(
        sourceInventory.id,
        afterQty,
        sourceRemainingPallets,
        sourceRemainingM3,
        tx
      );

      const destInventory = await this.inventoryRepository.upsertDestinationInventory(
        {
          clientId,
          productId: dto.productId,
          warehouseId: sourceInventory.warehouseId,
          binId: dto.toBinId,
          batchNumber: dto.batchNumber,
          expiryDate,
          quantity: dto.quantity,
          palletCount: transferPallets,
          volumeM3: transferM3,
        },
        tx
      );

      await this.inventoryRepository.updateBinUtilization(
        dto.fromBinId,
        -transferPallets,
        -transferM3,
        tx
      );

      await this.inventoryRepository.updateBinUtilization(
        dto.toBinId,
        transferPallets,
        transferM3,
        tx
      );

      const movement = await this.inventoryRepository.createStockMovement(
        {
          clientId,
          productId: dto.productId,
          fromBinId: dto.fromBinId,
          toBinId: dto.toBinId,
          batchNumber: dto.batchNumber,
          expiryDate,
          quantity: dto.quantity,
          beforeQty,
          afterQty,
          movedBy: userId,
        },
        tx
      );

      await this.auditService.log(
        {
          clientId,
          entityType: 'INVENTORY',
          entityId: sourceInventory.id,
          action: 'TRANSFER',
          performedBy: userId,
          oldValue: {
            productId: dto.productId,
            batch: dto.batchNumber,
            expiryDate: dto.expiryDate,
            fromBin: sourceInventory.bin.code,
            toBin: destBin.code,
            beforeQty,
            movedQty: dto.quantity,
            afterQty,
          },
          newValue: {
            sourceInventoryId: sourceInventory.id,
            destinationInventoryId: destInventory.id,
            movementId: movement.id,
            sourceRemainingQty: afterQty,
            destinationQty: destInventory.quantity,
          },
        },
        tx
      );

      return {
        movementId: movement.id,
        productId: dto.productId,
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate,
        fromBin: sourceInventory.bin.code,
        toBin: destBin.code,
        quantity: dto.quantity,
        beforeQty,
        afterQty,
        performedBy: userId,
      };
    });

    return result;
  }
}

export class ListInventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async execute(clientId: string) {
    if (!(await isDatabaseAvailable())) {
      return demoStore.listInventory(clientId);
    }

    const items = await this.inventoryRepository.findByTenant(clientId);
    return items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.product.sku,
      productName: item.product.name,
      binId: item.binId,
      binCode: item.bin.code,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate.toISOString().split('T')[0],
      quantity: item.quantity,
      palletCount: item.palletCount,
      volumeM3: item.volumeM3,
    }));
  }
}

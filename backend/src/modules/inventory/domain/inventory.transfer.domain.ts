import { BadRequestError } from '../../../common/errors/AppError';

export interface TransferValidationInput {
  sourceQuantity: number;
  requestedQuantity: number;
  destCurrentPallets: number;
  destCurrentM3: number;
  destCapacityPallets: number;
  destCapacityM3: number;
  transferPallets: number;
  transferM3: number;
  fromBinId: string;
  toBinId: string;
}

export class InventoryTransferDomain {
  validateTransfer(input: TransferValidationInput): void {
    if (input.fromBinId === input.toBinId) {
      throw new BadRequestError(
        'SAME_BIN_TRANSFER',
        'Source and destination bins must be different.'
      );
    }

    if (input.requestedQuantity <= 0) {
      throw new BadRequestError('INVALID_QUANTITY', 'Transfer quantity must be greater than zero.');
    }

    if (input.requestedQuantity > input.sourceQuantity) {
      throw new BadRequestError(
        'INSUFFICIENT_STOCK',
        `Requested quantity (${input.requestedQuantity}) exceeds available stock (${input.sourceQuantity}).`
      );
    }

    const newPallets = input.destCurrentPallets + input.transferPallets;
    const newM3 = input.destCurrentM3 + input.transferM3;

    if (newPallets > input.destCapacityPallets) {
      throw new BadRequestError(
        'BIN_CAPACITY_EXCEEDED',
        `Destination bin pallet capacity exceeded. Available: ${input.destCapacityPallets - input.destCurrentPallets}, requested: ${input.transferPallets}.`
      );
    }

    if (newM3 > input.destCapacityM3) {
      throw new BadRequestError(
        'BIN_CAPACITY_EXCEEDED',
        `Destination bin volume capacity exceeded. Available: ${(input.destCapacityM3 - input.destCurrentM3).toFixed(2)} m³, requested: ${input.transferM3.toFixed(2)} m³.`
      );
    }
  }

  computeTransferFootprint(
    sourceQty: number,
    sourcePallets: number,
    sourceVolumeM3: number,
    transferQty: number
  ): { transferPallets: number; transferM3: number } {
    if (sourceQty === 0) {
      return { transferPallets: 0, transferM3: 0 };
    }

    const ratio = transferQty / sourceQty;
    return {
      transferPallets: Math.ceil(sourcePallets * ratio),
      transferM3: sourceVolumeM3 * ratio,
    };
  }
}

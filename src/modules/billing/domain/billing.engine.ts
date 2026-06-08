export interface InvoiceLineItemResult {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceTotals {
  storage: number;
  inbound: number;
  outbound: number;
  grandTotal: number;
}

export interface InvoiceResult {
  lineItems: InvoiceLineItemResult[];
  totals: InvoiceTotals;
}

export interface StorageInput {
  billingType: 'PALLET' | 'VOLUME';
  occupiedPallets: number;
  volumeM3: number;
  dailyStorageRate: number;
  daysInMonth: number;
}

export interface MovementFeeInput {
  quantity: number;
  rate: number;
}

/**
 * Pure domain logic for 3PL storage billing.
 * Keeps calculation rules isolated from persistence and HTTP layers.
 */
export class BillingEngine {
  calculateStorageFee(input: StorageInput): number {
    const { billingType, occupiedPallets, volumeM3, dailyStorageRate, daysInMonth } = input;

    if (billingType === 'PALLET') {
      return occupiedPallets * dailyStorageRate * daysInMonth;
    }

    return volumeM3 * dailyStorageRate * daysInMonth;
  }

  calculateInboundFee(input: MovementFeeInput): number {
    return input.quantity * input.rate;
  }

  calculateOutboundFee(input: MovementFeeInput): number {
    return input.quantity * input.rate;
  }

  generateInvoice(params: {
    billingType: 'PALLET' | 'VOLUME';
    occupiedPallets: number;
    volumeM3: number;
    dailyStorageRate: number;
    daysInMonth: number;
    inboundQuantity: number;
    outboundQuantity: number;
    inboundRate: number;
    outboundRate: number;
  }): InvoiceResult {
    const storageAmount = this.calculateStorageFee({
      billingType: params.billingType,
      occupiedPallets: params.occupiedPallets,
      volumeM3: params.volumeM3,
      dailyStorageRate: params.dailyStorageRate,
      daysInMonth: params.daysInMonth,
    });

    const inboundAmount = this.calculateInboundFee({
      quantity: params.inboundQuantity,
      rate: params.inboundRate,
    });

    const outboundAmount = this.calculateOutboundFee({
      quantity: params.outboundQuantity,
      rate: params.outboundRate,
    });

    const lineItems: InvoiceLineItemResult[] = [];

    if (params.billingType === 'PALLET') {
      lineItems.push({
        description: 'Monthly Storage (Pallet-based)',
        quantity: params.occupiedPallets * params.daysInMonth,
        rate: params.dailyStorageRate,
        amount: storageAmount,
      });
    } else {
      lineItems.push({
        description: 'Monthly Storage (Volume-based M³)',
        quantity: params.volumeM3 * params.daysInMonth,
        rate: params.dailyStorageRate,
        amount: storageAmount,
      });
    }

    if (params.inboundQuantity > 0) {
      lineItems.push({
        description: 'Inbound Handling Fees (Receiving)',
        quantity: params.inboundQuantity,
        rate: params.inboundRate,
        amount: inboundAmount,
      });
    }

    if (params.outboundQuantity > 0) {
      lineItems.push({
        description: 'Outbound Handling Fees (Picking/Packing)',
        quantity: params.outboundQuantity,
        rate: params.outboundRate,
        amount: outboundAmount,
      });
    }

    return {
      lineItems,
      totals: {
        storage: storageAmount,
        inbound: inboundAmount,
        outbound: outboundAmount,
        grandTotal: storageAmount + inboundAmount + outboundAmount,
      },
    };
  }
}

import { randomUUID } from 'crypto';
import { BillingEngine } from '../modules/billing/domain/billing.engine';
import { InventoryTransferDomain } from '../modules/inventory/domain/inventory.transfer.domain';
import { NotFoundError } from '../common/errors/AppError';
import { getDaysInMonth } from '../common/utils/date.utils';

/** Valid hex-only UUIDs for Zod validation and Prisma compatibility. */
const IDS = {
  clientA: 'a1000000-0000-4000-8000-000000000001',
  clientB: 'b1000000-0000-4000-8000-000000000002',
  userA: 'c1000000-0000-4000-8000-000000000001',
  userB: 'c2000000-0000-4000-8000-000000000002',
  warehouse: 'd1000000-0000-4000-8000-000000000001',
  binA1: 'e1000000-0000-4000-8000-000000000001',
  binA2: 'e1000000-0000-4000-8000-000000000002',
  binB1: 'e1000000-0000-4000-8000-000000000003',
  productA1: 'f1000000-0000-4000-8000-000000000001',
  productA2: 'f1000000-0000-4000-8000-000000000002',
  productB1: 'f2000000-0000-4000-8000-000000000001',
  invA1: '11000000-0000-4000-8000-000000000001',
  invA2: '11000000-0000-4000-8000-000000000002',
  invB1: '11000000-0000-4000-8000-000000000003',
  auditSeed: '21000000-0000-4000-8000-000000000001',
} as const;

/** In-memory store used when Supabase is unreachable (e.g. local Windows dev). */
class DemoStore {
  private readonly transferDomain = new InventoryTransferDomain();
  private readonly billingEngine = new BillingEngine();

  readonly clientA = {
    id: IDS.clientA,
    name: 'Client A — Pallet Billing',
    billingType: 'PALLET' as const,
  };
  readonly clientB = {
    id: IDS.clientB,
    name: 'Client B — Volume Billing',
    billingType: 'VOLUME' as const,
  };
  readonly userA = {
    id: IDS.userA,
    name: 'Alice Operator',
    clientId: IDS.clientA,
  };
  readonly userB = {
    id: IDS.userB,
    name: 'Bob Supervisor',
    clientId: IDS.clientB,
  };
  readonly warehouse = {
    id: IDS.warehouse,
    name: 'Warehouse A',
  };
  readonly bins = {
    A1: {
      id: IDS.binA1,
      code: 'A1',
      capacityPallets: 50,
      capacityM3: 100,
      currentPallets: 2,
      currentM3: 4.5,
    },
    A2: {
      id: IDS.binA2,
      code: 'A2',
      capacityPallets: 30,
      capacityM3: 60,
      currentPallets: 1,
      currentM3: 2.0,
    },
    B1: {
      id: IDS.binB1,
      code: 'B1',
      capacityPallets: 20,
      capacityM3: 40,
      currentPallets: 0,
      currentM3: 0,
    },
  };
  readonly productA1 = {
    id: IDS.productA1,
    clientId: IDS.clientA,
    sku: 'SKU-A-001',
    name: 'Premium Widget',
    unitVolume: 0.05,
  };
  readonly productA2 = {
    id: IDS.productA2,
    clientId: IDS.clientA,
    sku: 'SKU-A-002',
    name: 'Standard Gadget',
    unitVolume: 0.03,
  };
  readonly productB1 = {
    id: IDS.productB1,
    clientId: IDS.clientB,
    sku: 'SKU-B-001',
    name: 'Bulk Commodity',
    unitVolume: 0.1,
  };

  inventory = [
    {
      id: IDS.invA1,
      clientId: IDS.clientA,
      productId: IDS.productA1,
      binId: IDS.binA1,
      batchNumber: 'LOT-001',
      expiryDate: '2027-01-01',
      quantity: 100,
      palletCount: 2,
      volumeM3: 5.0,
    },
    {
      id: IDS.invA2,
      clientId: IDS.clientA,
      productId: IDS.productA2,
      binId: IDS.binA2,
      batchNumber: 'LOT-002',
      expiryDate: '2026-06-15',
      quantity: 200,
      palletCount: 1,
      volumeM3: 6.0,
    },
    {
      id: IDS.invB1,
      clientId: IDS.clientB,
      productId: IDS.productB1,
      binId: IDS.binB1,
      batchNumber: 'LOT-B-001',
      expiryDate: '2028-03-20',
      quantity: 500,
      palletCount: 3,
      volumeM3: 50.0,
    },
  ];

  billingRates: Record<string, { storageRate: number; inboundRate: number; outboundRate: number }> = {
    [IDS.clientA]: { storageRate: 2.5, inboundRate: 0.75, outboundRate: 1.25 },
    [IDS.clientB]: { storageRate: 0.15, inboundRate: 0.5, outboundRate: 0.9 },
  };

  stockMovements = [
    { clientId: IDS.clientA, movementType: 'INBOUND', quantity: 100, month: '2025-12' },
    { clientId: IDS.clientA, movementType: 'OUTBOUND', quantity: 30, month: '2025-12' },
    { clientId: IDS.clientB, movementType: 'INBOUND', quantity: 500, month: '2025-12' },
  ];

  auditLogs: Array<{
    id: string;
    clientId: string;
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    oldValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
    createdAt: string;
  }> = [
    {
      id: IDS.auditSeed,
      clientId: IDS.clientA,
      entityType: 'INVENTORY',
      entityId: IDS.invA1,
      action: 'SEED',
      performedBy: IDS.userA,
      oldValue: { note: 'Initial seed data' },
      newValue: { quantity: 100, bin: 'A1' },
      createdAt: new Date().toISOString(),
    },
  ];

  invoices: Array<{
    id: string;
    clientId: string;
    invoiceMonth: string;
    storageTotal: number;
    inboundTotal: number;
    outboundTotal: number;
    grandTotal: number;
    lineItems: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  }> = [];

  getSeedInfo() {
    return {
      generatedAt: new Date().toISOString(),
      source: 'demo-store',
      dbConnected: false,
      clients: {
        clientA: {
          id: this.clientA.id,
          name: this.clientA.name,
          billingType: this.clientA.billingType,
          userId: this.userA.id,
          userName: this.userA.name,
        },
        clientB: {
          id: this.clientB.id,
          name: this.clientB.name,
          billingType: this.clientB.billingType,
          userId: this.userB.id,
          userName: this.userB.name,
        },
      },
      warehouse: this.warehouse,
      bins: { A1: this.bins.A1.id, A2: this.bins.A2.id, B1: this.bins.B1.id },
      products: { clientA1: this.productA1.id },
      examples: {
        clientATransfer: {
          productId: this.productA1.id,
          fromBinId: this.bins.A1.id,
          toBinId: this.bins.A2.id,
          batchNumber: 'LOT-001',
          expiryDate: '2027-01-01',
          quantity: 20,
        },
      },
    };
  }

  listInventory(clientId: string) {
    const products = [this.productA1, this.productA2, this.productB1];
    const binMap = { [this.bins.A1.id]: this.bins.A1, [this.bins.A2.id]: this.bins.A2, [this.bins.B1.id]: this.bins.B1 };

    return this.inventory
      .filter((i) => i.clientId === clientId)
      .map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        const bin = binMap[item.binId as keyof typeof binMap];
        return {
          id: item.id,
          productId: item.productId,
          sku: product.sku,
          productName: product.name,
          binId: item.binId,
          binCode: bin.code,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          palletCount: item.palletCount,
          volumeM3: item.volumeM3,
        };
      });
  }

  transfer(
    clientId: string,
    userId: string,
    dto: {
      productId: string;
      fromBinId: string;
      toBinId: string;
      batchNumber: string;
      expiryDate: string;
      quantity: number;
    }
  ) {
    const products = [this.productA1, this.productA2, this.productB1];
    const product = products.find((p) => p.id === dto.productId && p.clientId === clientId);
    if (!product) throw new NotFoundError('PRODUCT_NOT_FOUND', 'Product not found for this tenant.');

    const sourceIdx = this.inventory.findIndex(
      (i) =>
        i.clientId === clientId &&
        i.productId === dto.productId &&
        i.binId === dto.fromBinId &&
        i.batchNumber === dto.batchNumber &&
        i.expiryDate === dto.expiryDate
    );
    if (sourceIdx === -1) {
      throw new NotFoundError('INVENTORY_NOT_FOUND', 'No matching inventory found.');
    }

    const source = this.inventory[sourceIdx];
    const binMap = { [this.bins.A1.id]: this.bins.A1, [this.bins.A2.id]: this.bins.A2, [this.bins.B1.id]: this.bins.B1 };
    const fromBin = binMap[dto.fromBinId as keyof typeof binMap];
    const toBin = binMap[dto.toBinId as keyof typeof binMap];
    if (!fromBin || !toBin) throw new NotFoundError('BIN_NOT_FOUND', 'Bin not found.');

    const { transferPallets, transferM3 } = this.transferDomain.computeTransferFootprint(
      source.quantity,
      source.palletCount,
      source.volumeM3,
      dto.quantity
    );

    this.transferDomain.validateTransfer({
      sourceQuantity: source.quantity,
      requestedQuantity: dto.quantity,
      destCurrentPallets: toBin.currentPallets,
      destCurrentM3: toBin.currentM3,
      destCapacityPallets: toBin.capacityPallets,
      destCapacityM3: toBin.capacityM3,
      transferPallets,
      transferM3,
      fromBinId: dto.fromBinId,
      toBinId: dto.toBinId,
    });

    const beforeQty = source.quantity;
    const afterQty = beforeQty - dto.quantity;

    source.quantity = afterQty;
    source.palletCount = Math.max(0, source.palletCount - transferPallets);
    source.volumeM3 = Math.max(0, source.volumeM3 - transferM3);
    if (source.quantity === 0) this.inventory.splice(sourceIdx, 1);

    const destIdx = this.inventory.findIndex(
      (i) =>
        i.clientId === clientId &&
        i.productId === dto.productId &&
        i.binId === dto.toBinId &&
        i.batchNumber === dto.batchNumber &&
        i.expiryDate === dto.expiryDate
    );
    if (destIdx >= 0) {
      this.inventory[destIdx].quantity += dto.quantity;
      this.inventory[destIdx].palletCount += transferPallets;
      this.inventory[destIdx].volumeM3 += transferM3;
    } else {
      this.inventory.push({
        id: randomUUID(),
        clientId,
        productId: dto.productId,
        binId: dto.toBinId,
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate,
        quantity: dto.quantity,
        palletCount: transferPallets,
        volumeM3: transferM3,
      });
    }

    fromBin.currentPallets -= transferPallets;
    fromBin.currentM3 -= transferM3;
    toBin.currentPallets += transferPallets;
    toBin.currentM3 += transferM3;

    const movementId = randomUUID();
    const auditId = randomUUID();

    this.auditLogs.unshift({
      id: auditId,
      clientId,
      entityType: 'INVENTORY',
      entityId: source.id,
      action: 'TRANSFER',
      performedBy: userId,
      oldValue: {
        productId: dto.productId,
        batch: dto.batchNumber,
        fromBin: fromBin.code,
        toBin: toBin.code,
        beforeQty,
        movedQty: dto.quantity,
        afterQty,
      },
      newValue: { movementId, afterQty },
      createdAt: new Date().toISOString(),
    });

    return {
      movementId,
      productId: dto.productId,
      batchNumber: dto.batchNumber,
      expiryDate: dto.expiryDate,
      fromBin: fromBin.code,
      toBin: toBin.code,
      quantity: dto.quantity,
      beforeQty,
      afterQty,
      performedBy: userId,
      mode: 'demo-store',
    };
  }

  generateInvoice(clientId: string, month: string) {
    const client =
      clientId === this.clientA.id ? this.clientA : clientId === this.clientB.id ? this.clientB : null;
    if (!client) throw new NotFoundError('BILLING_CONTEXT_NOT_FOUND', 'Client not found.');

    const rates = this.billingRates[clientId];
    if (!rates) throw new NotFoundError('BILLING_CONTEXT_NOT_FOUND', 'Billing rates not found.');

    const tenantInventory = this.inventory.filter((i) => i.clientId === clientId);
    const occupiedPallets = tenantInventory.reduce((s, i) => s + i.palletCount, 0);
    const volumeM3 = tenantInventory.reduce((s, i) => s + i.volumeM3, 0);

    const movements = this.stockMovements.filter((m) => m.clientId === clientId && m.month === month);
    const inboundQuantity = movements.filter((m) => m.movementType === 'INBOUND').reduce((s, m) => s + m.quantity, 0);
    const outboundQuantity = movements.filter((m) => m.movementType === 'OUTBOUND').reduce((s, m) => s + m.quantity, 0);

    const daysInMonth = getDaysInMonth(month);
    const result = this.billingEngine.generateInvoice({
      billingType: client.billingType,
      occupiedPallets,
      volumeM3,
      dailyStorageRate: rates.storageRate,
      daysInMonth,
      inboundQuantity,
      outboundQuantity,
      inboundRate: rates.inboundRate,
      outboundRate: rates.outboundRate,
    });

    const existing = this.invoices.find((i) => i.clientId === clientId && i.invoiceMonth === month);
    const invoiceId = existing?.id ?? randomUUID();

    const invoice = {
      id: invoiceId,
      clientId,
      invoiceMonth: month,
      storageTotal: result.totals.storage,
      inboundTotal: result.totals.inbound,
      outboundTotal: result.totals.outbound,
      grandTotal: result.totals.grandTotal,
      lineItems: result.lineItems,
    };

    if (existing) Object.assign(existing, invoice);
    else this.invoices.push(invoice);

    return {
      invoiceId,
      client: { id: client.id, name: client.name, billingType: client.billingType },
      month,
      lineItems: result.lineItems,
      totals: result.totals,
      mode: 'demo-store',
    };
  }

  getInvoice(invoiceId: string, clientId: string) {
    const invoice = this.invoices.find((i) => i.id === invoiceId && i.clientId === clientId);
    if (!invoice) throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found.');

    const client =
      clientId === this.clientA.id ? this.clientA : clientId === this.clientB.id ? this.clientB : null;

    return {
      invoiceId: invoice.id,
      client,
      month: invoice.invoiceMonth,
      lineItems: invoice.lineItems,
      totals: {
        storage: invoice.storageTotal,
        inbound: invoice.inboundTotal,
        outbound: invoice.outboundTotal,
        grandTotal: invoice.grandTotal,
      },
    };
  }

  getAuditLogs(clientId: string) {
    return this.auditLogs.filter((l) => l.clientId === clientId);
  }
}

export const demoStore = new DemoStore();

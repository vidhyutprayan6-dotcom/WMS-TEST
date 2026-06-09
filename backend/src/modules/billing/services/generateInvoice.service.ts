import { BillingRepository } from '../repositories/billing.repository';
import { BillingEngine } from '../domain/billing.engine';
import { isDatabaseAvailable } from '../../../database/connection';
import { demoStore } from '../../../demo/demo-store';
import { NotFoundError } from '../../../common/errors/AppError';
import { getDaysInMonth } from '../../../common/utils/date.utils';

export class GenerateInvoiceService {
  private readonly billingEngine = new BillingEngine();

  constructor(private readonly billingRepository: BillingRepository) {}

  async execute(clientId: string, month: string) {
    if (!(await isDatabaseAvailable())) {
      return demoStore.generateInvoice(clientId, month);
    }

    const context = await this.billingRepository.getBillingContext(clientId, month);

    if (!context) {
      throw new NotFoundError(
        'BILLING_CONTEXT_NOT_FOUND',
        'Client or billing rates not found for the specified tenant.'
      );
    }

    const daysInMonth = getDaysInMonth(month);

    const invoiceResult = this.billingEngine.generateInvoice({
      billingType: context.client.billingType as 'PALLET' | 'VOLUME',
      occupiedPallets: context.occupiedPallets,
      volumeM3: context.volumeM3,
      dailyStorageRate: context.billingRate.storageRate,
      daysInMonth,
      inboundQuantity: context.inboundQuantity,
      outboundQuantity: context.outboundQuantity,
      inboundRate: context.billingRate.inboundRate,
      outboundRate: context.billingRate.outboundRate,
    });

    const saved = await this.billingRepository.saveInvoice(
      clientId,
      month,
      invoiceResult.totals,
      invoiceResult.lineItems
    );

    return {
      invoiceId: saved.id,
      client: {
        id: context.client.id,
        name: context.client.name,
        billingType: context.client.billingType,
      },
      month,
      lineItems: saved.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })),
      totals: invoiceResult.totals,
    };
  }

  async getInvoice(invoiceId: string, clientId: string) {
    if (!(await isDatabaseAvailable())) {
      return demoStore.getInvoice(invoiceId, clientId);
    }

    const invoice = await this.billingRepository.getInvoiceById(invoiceId, clientId);

    if (!invoice) {
      throw new NotFoundError('INVOICE_NOT_FOUND', 'Invoice not found for this tenant.');
    }

    return {
      invoiceId: invoice.id,
      client: invoice.client,
      month: invoice.invoiceMonth,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      })),
      totals: {
        storage: invoice.storageTotal,
        inbound: invoice.inboundTotal,
        outbound: invoice.outboundTotal,
        grandTotal: invoice.grandTotal,
      },
    };
  }
}

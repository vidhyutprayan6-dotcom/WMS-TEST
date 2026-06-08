import { Request, Response, NextFunction } from 'express';
import { GenerateInvoiceService } from '../services/generateInvoice.service';
import { generateInvoiceSchema } from '../dto/billing.dto';
import { TenantRequest } from '../../../middlewares/tenant.middleware';

export class BillingController {
  constructor(private readonly generateInvoiceService: GenerateInvoiceService) {}

  generate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantReq = req as TenantRequest;
      const dto = generateInvoiceSchema.parse(req.body);
      const clientId = dto.clientId ?? tenantReq.clientId;

      if (clientId !== tenantReq.clientId) {
        res.status(403).json({
          success: false,
          error: 'TENANT_MISMATCH',
          message: 'Request clientId does not match authenticated tenant.',
        });
        return;
      }

      const result = await this.generateInvoiceService.execute(clientId, dto.month);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantReq = req as TenantRequest;
      const invoiceId = req.params.id as string;
      const result = await this.generateInvoiceService.getInvoice(invoiceId, tenantReq.clientId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}

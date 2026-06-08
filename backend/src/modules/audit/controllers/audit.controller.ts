import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant.middleware';
import { AuditService } from '../services/audit.service';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantReq = req as TenantRequest;
      const logs = await this.auditService.getLogsForClient(tenantReq.clientId);
      res.status(200).json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  };
}

import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from '../../../middlewares/tenant.middleware';
import { transferInventorySchema } from '../dto/inventory.dto';
import { ListInventoryService, TransferInventoryService } from '../services/inventory.service';

export class InventoryController {
  constructor(
    private readonly transferService: TransferInventoryService,
    private readonly listService: ListInventoryService
  ) {}

  transfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantReq = req as TenantRequest;
      const dto = transferInventorySchema.parse(req.body);
      const result = await this.transferService.execute(tenantReq.clientId, tenantReq.userId, dto);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantReq = req as TenantRequest;
      const result = await this.listService.execute(tenantReq.clientId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}

import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryRepository } from '../repositories/inventory.repository';
import { ListInventoryService, TransferInventoryService } from '../services/inventory.service';
import { AuditRepository } from '../../audit/repositories/audit.repository';
import { AuditService } from '../../audit/services/audit.service';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
const inventoryRepository = new InventoryRepository();
const auditService = new AuditService(new AuditRepository());
const transferService = new TransferInventoryService(inventoryRepository, auditService);
const listService = new ListInventoryService(inventoryRepository);
const inventoryController = new InventoryController(transferService, listService);

router.get('/', tenantMiddleware, inventoryController.list);
router.post('/transfer', tenantMiddleware, inventoryController.transfer);

export default router;

import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { AuditRepository } from '../repositories/audit.repository';
import { AuditService } from '../services/audit.service';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
const auditController = new AuditController(new AuditService(new AuditRepository()));

router.get('/', tenantMiddleware, auditController.list);

export default router;

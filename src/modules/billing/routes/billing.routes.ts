import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller';
import { BillingRepository } from '../repositories/billing.repository';
import { GenerateInvoiceService } from '../services/generateInvoice.service';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';

const router = Router();
const billingRepository = new BillingRepository();
const generateInvoiceService = new GenerateInvoiceService(billingRepository);
const billingController = new BillingController(generateInvoiceService);

router.post('/generate', tenantMiddleware, billingController.generate);

export default router;

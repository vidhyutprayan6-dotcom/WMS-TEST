import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import billingRoutes from './modules/billing/routes/billing.routes';
import inventoryRoutes from './modules/inventory/routes/inventory.routes';
import auditRoutes from './modules/audit/routes/audit.routes';
import configRoutes from './modules/config/config.routes';
import { BillingController } from './modules/billing/controllers/billing.controller';
import { BillingRepository } from './modules/billing/repositories/billing.repository';
import { GenerateInvoiceService } from './modules/billing/services/generateInvoice.service';
import { tenantMiddleware } from './middlewares/tenant.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { isOriginAllowed } from './common/utils/cors.utils';

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'wms-3pl-backend' });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/config', configRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/audit-logs', auditRoutes);

const billingRepository = new BillingRepository();
const generateInvoiceService = new GenerateInvoiceService(billingRepository);
const billingController = new BillingController(generateInvoiceService);

app.get('/api/invoices/:id', tenantMiddleware, billingController.getById);

app.use(errorMiddleware);

export default app;

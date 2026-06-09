import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '3PL/4PL Warehouse Management System API',
      version: '1.0.0',
      description:
        'Backend APIs for 3PL storage billing, inventory transfer with batch/lot traceability, multi-tenant isolation, and audit trail.',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3006',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local development',
      },
    ],
    components: {
      securitySchemes: {
        TenantHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-client-id',
          description: 'Tenant client UUID — enforces multi-tenant data isolation',
        },
        UserHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User UUID performing the action — required for audit trail',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'INSUFFICIENT_STOCK' },
            message: { type: 'string', example: 'Requested quantity exceeds available stock.' },
          },
        },
        GenerateInvoiceRequest: {
          type: 'object',
          required: ['month'],
          properties: {
            clientId: { type: 'string', format: 'uuid', description: 'Optional — must match x-client-id header' },
            month: { type: 'string', example: '2025-12', pattern: '^\\d{4}-\\d{2}$' },
          },
        },
        TransferInventoryRequest: {
          type: 'object',
          required: ['productId', 'fromBinId', 'toBinId', 'batchNumber', 'expiryDate', 'quantity'],
          properties: {
            productId: { type: 'string', format: 'uuid' },
            fromBinId: { type: 'string', format: 'uuid' },
            toBinId: { type: 'string', format: 'uuid' },
            batchNumber: { type: 'string', example: 'LOT-001' },
            expiryDate: { type: 'string', format: 'date', example: '2027-01-01' },
            quantity: { type: 'integer', minimum: 1, example: 50 },
          },
        },
      },
    },
    security: [{ TenantHeader: [], UserHeader: [] }],
    paths: {
      '/api/billing/generate': {
        post: {
          tags: ['Billing'],
          summary: 'Generate monthly storage invoice for a B2B client',
          description:
            'Calculates storage fees (pallet or volume based), inbound handling, and outbound handling line items.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GenerateInvoiceRequest' },
                example: { month: '2025-12' },
              },
            },
          },
          responses: {
            200: { description: 'Invoice generated successfully' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Client or billing rates not found' },
          },
        },
      },
      '/api/invoices/{id}': {
        get: {
          tags: ['Billing'],
          summary: 'Get invoice by ID (tenant-scoped)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Invoice retrieved' },
            404: { description: 'Invoice not found' },
          },
        },
      },
      '/api/inventory': {
        get: {
          tags: ['Inventory'],
          summary: 'List inventory for current tenant',
          responses: { 200: { description: 'Inventory list' } },
        },
      },
      '/api/inventory/transfer': {
        post: {
          tags: ['Inventory'],
          summary: 'Transfer inventory between bins with batch/lot traceability',
          description:
            'Executes an atomic transfer with capacity validation, stock movement logging, and audit trail.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransferInventoryRequest' },
              },
            },
          },
          responses: {
            200: { description: 'Transfer completed' },
            400: {
              description: 'Validation error (insufficient stock, capacity exceeded, etc.)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            404: { description: 'Product, inventory, or bin not found' },
          },
        },
      },
      '/api/audit-logs': {
        get: {
          tags: ['Audit'],
          summary: 'List audit logs for current tenant',
          responses: { 200: { description: 'Audit log entries' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

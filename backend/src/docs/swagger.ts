import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '3PL/4PL Warehouse Management System API',
      version: '1.0.0',
      description: `
## Overview
REST API for the WMS 3PL technical evaluation covering:

**A. Storage Billing Engine** — monthly invoice (pallet × daily rate OR volume M³), plus inbound/outbound handling fees.

**B. Stock Movement & Traceability** — bin-to-bin transfer with batch/lot and expiry enforcement, multi-tenant isolation.

**Quality criteria:** Clean Architecture (domain logic separated from persistence), audit trail, robust validation errors, OpenAPI documentation.

## Authentication
No OAuth/JWT. Multi-tenant context via headers on every protected endpoint:
- \`x-client-id\` — tenant UUID (data isolation)
- \`x-user-id\` — operator UUID (audit trail)

Get test UUIDs from \`GET /api/config/seed-info\`.

## Error format
\`\`\`json
{ "success": false, "error": "ERROR_CODE", "message": "Human-readable detail" }
\`\`\`

| Code | HTTP | When |
|------|------|------|
| TENANT_REQUIRED | 400 | Missing x-client-id |
| USER_REQUIRED | 400 | Missing x-user-id |
| VALIDATION_ERROR | 400 | Invalid request body |
| INSUFFICIENT_STOCK | 400 | Transfer qty > available |
| SAME_BIN_TRANSFER | 400 | fromBinId === toBinId |
| BIN_CAPACITY_EXCEEDED | 400 | Destination bin over capacity |
| TENANT_MISMATCH | 403 | Body clientId ≠ header |
| PRODUCT_NOT_FOUND | 404 | Product not in tenant |
| INVENTORY_NOT_FOUND | 404 | No matching stock row |
| INVOICE_NOT_FOUND | 404 | Invoice not found |
| BILLING_CONTEXT_NOT_FOUND | 404 | Client or rates missing |
      `.trim(),
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3006',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Local development',
      },
    ],
    tags: [
      { name: 'System', description: 'Health and configuration' },
      { name: 'Billing', description: 'Requirement A — Storage billing engine' },
      { name: 'Inventory', description: 'Requirement B — Stock movement & traceability' },
      { name: 'Audit', description: 'Audit trail for inventory actions' },
    ],
    components: {
      securitySchemes: {
        TenantHeader: { type: 'apiKey', in: 'header', name: 'x-client-id' },
        UserHeader: { type: 'apiKey', in: 'header', name: 'x-user-id' },
      },
      schemas: {
        SuccessWrapper: {
          type: 'object',
          properties: { success: { type: 'boolean', example: true } },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'INSUFFICIENT_STOCK' },
            message: { type: 'string', example: 'Requested quantity (9999) exceeds available stock (100).' },
          },
        },
        GenerateInvoiceRequest: {
          type: 'object',
          required: ['month'],
          properties: {
            month: { type: 'string', example: '2025-12', pattern: '^\\d{4}-\\d{2}$' },
            clientId: { type: 'string', format: 'uuid', description: 'Optional — must match x-client-id' },
          },
        },
        InvoiceLineItem: {
          type: 'object',
          properties: {
            description: { type: 'string', example: 'Storage (Pallet × daily rate × days)' },
            quantity: { type: 'number', example: 62 },
            rate: { type: 'number', example: 2.5 },
            amount: { type: 'number', example: 155 },
          },
        },
        InvoiceResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessWrapper' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    invoiceId: { type: 'string', format: 'uuid' },
                    month: { type: 'string', example: '2025-12' },
                    client: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        billingType: { type: 'string', enum: ['PALLET', 'VOLUME'] },
                      },
                    },
                    lineItems: { type: 'array', items: { $ref: '#/components/schemas/InvoiceLineItem' } },
                    totals: {
                      type: 'object',
                      properties: {
                        storage: { type: 'number' },
                        inbound: { type: 'number' },
                        outbound: { type: 'number' },
                        grandTotal: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid' },
            sku: { type: 'string', example: 'SKU-A-001' },
            productName: { type: 'string' },
            binId: { type: 'string', format: 'uuid' },
            binCode: { type: 'string', example: 'A1' },
            batchNumber: { type: 'string', example: 'LOT-001' },
            expiryDate: { type: 'string', format: 'date', example: '2027-01-01' },
            quantity: { type: 'integer', example: 100 },
            palletCount: { type: 'integer' },
            volumeM3: { type: 'number' },
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
            quantity: { type: 'integer', minimum: 1, example: 20 },
          },
        },
        TransferResponse: {
          allOf: [
            { $ref: '#/components/schemas/SuccessWrapper' },
            {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    movementId: { type: 'string', format: 'uuid' },
                    productId: { type: 'string', format: 'uuid' },
                    batchNumber: { type: 'string' },
                    expiryDate: { type: 'string' },
                    fromBin: { type: 'string', example: 'A1' },
                    toBin: { type: 'string', example: 'A2' },
                    quantity: { type: 'integer' },
                    beforeQty: { type: 'integer', description: 'Source qty before transfer' },
                    afterQty: { type: 'integer', description: 'Source qty after transfer' },
                    performedBy: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          ],
        },
        AuditLogEntry: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            clientId: { type: 'string', format: 'uuid' },
            entityType: { type: 'string', example: 'INVENTORY' },
            entityId: { type: 'string', format: 'uuid' },
            action: { type: 'string', example: 'TRANSFER' },
            performedBy: { type: 'string', format: 'uuid', description: 'User who performed the action' },
            oldValue: { type: 'object', description: 'State before action (includes beforeQty)' },
            newValue: { type: 'object', description: 'State after action (includes afterQty)' },
            createdAt: { type: 'string', format: 'date-time', description: 'When the action occurred' },
          },
        },
      },
    },
    security: [{ TenantHeader: [], UserHeader: [] }],
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          security: [],
          responses: {
            200: {
              description: 'Service is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      service: { type: 'string', example: 'wms-3pl-backend' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/config/seed-info': {
        get: {
          tags: ['System'],
          summary: 'Get test tenant UUIDs for API calls',
          description: 'Returns client, user, bin, and product IDs for the test UI and integration testing.',
          security: [],
          responses: {
            200: { description: 'Seed configuration with UUIDs and example transfer payload' },
          },
        },
      },
      '/api/billing/generate': {
        post: {
          tags: ['Billing'],
          summary: 'Generate monthly storage invoice',
          description:
            '**Requirement A.** Calculates storage (pallets × daily rate × days OR volume M³), inbound handling, and outbound handling line items.',
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
            200: {
              description: 'Invoice generated and persisted',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceResponse' } } },
            },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Client or billing rates not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/invoices/{id}': {
        get: {
          tags: ['Billing'],
          summary: 'Get invoice by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Invoice retrieved', content: { 'application/json': { schema: { $ref: '#/components/schemas/InvoiceResponse' } } } },
            404: { description: 'Invoice not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/inventory': {
        get: {
          tags: ['Inventory'],
          summary: 'List tenant inventory',
          description: '**Requirement B.** Returns only stock belonging to the authenticated tenant (x-client-id).',
          responses: {
            200: {
              description: 'Inventory list',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessWrapper' },
                      { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } } } },
                    ],
                  },
                },
              },
            },
            400: { description: 'Missing tenant headers', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/inventory/transfer': {
        post: {
          tags: ['Inventory'],
          summary: 'Transfer inventory between bins',
          description:
            '**Requirement B.** Atomic bin-to-bin transfer. Enforces batch/lot + expiry match, stock availability, and destination bin capacity. Creates stock_movement + audit_log records.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransferInventoryRequest' },
                example: {
                  productId: 'f1000001-0001-4000-8000-000000000001',
                  fromBinId: 'e1000001-0001-4000-8000-000000000001',
                  toBinId: 'e1000001-0001-4000-8000-000000000002',
                  batchNumber: 'LOT-001',
                  expiryDate: '2027-01-01',
                  quantity: 20,
                },
              },
            },
          },
          responses: {
            200: { description: 'Transfer completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferResponse' } } } },
            400: { description: 'Validation / business rule error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Product, inventory, or bin not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/audit-logs': {
        get: {
          tags: ['Audit'],
          summary: 'List audit logs for tenant',
          description:
            'Returns transaction log for inventory movements: **who** (performedBy), **when** (createdAt), **initial quantity** and **final balance** (oldValue/newValue JSON).',
          responses: {
            200: {
              description: 'Audit log entries (newest first)',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/SuccessWrapper' },
                      { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/AuditLogEntry' } } } },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

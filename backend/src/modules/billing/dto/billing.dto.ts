import { z } from 'zod';

export const generateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});

export type GenerateInvoiceDto = z.infer<typeof generateInvoiceSchema>;

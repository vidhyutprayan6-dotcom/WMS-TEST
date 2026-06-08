import { z } from 'zod';

export const transferInventorySchema = z.object({
  productId: z.string().uuid(),
  fromBinId: z.string().uuid(),
  toBinId: z.string().uuid(),
  batchNumber: z.string().min(1),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expiry date must be YYYY-MM-DD'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
});

export type TransferInventoryDto = z.infer<typeof transferInventorySchema>;

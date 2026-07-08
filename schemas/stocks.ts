import { z } from "zod";

export const createStockHoldingSchema = z.object({
  symbol: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()),
  name: z.string().trim().optional(),
  quantity: z.string().trim().regex(/^\d+(\.\d{1,4})?$/, "Use a valid quantity").default("0"),
  averageCost: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : "0"))
    .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Use a valid average cost")),
  notes: z.string().trim().optional(),
});

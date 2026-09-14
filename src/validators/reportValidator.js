import { z } from "zod";

export const reportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

import { z } from "zod";

export const updateLenderFileSchema = z.object({
  loan_review_status: z
    .enum([
      "not_ready",
      "pending",
      "in_review",
      "approved",
      "declined",
      "more_info_needed",
    ])
    .optional(),
  bank_notes: z.string().max(2000).optional().nullable(),
});

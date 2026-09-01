import { z } from "zod";

export const createCohortSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(30),
  capacity: z.coerce.number().int().min(1).max(500).default(30),
  location: z.string().trim().max(120).optional().nullable(),
  start_date: z.string().optional().nullable(),
  partner_bank: z.string().trim().max(80).optional().nullable(),
  institution_id: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional()
    .nullable(),
  applications_open: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateCohortSchema = createCohortSchema.partial();

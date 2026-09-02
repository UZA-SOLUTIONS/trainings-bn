import { z } from "zod";

export const createCourseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30),
  description: z.string().trim().max(1000).optional().nullable(),
  duration_weeks: z.coerce.number().int().min(1).max(52).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

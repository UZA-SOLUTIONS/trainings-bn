import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, { message: "Choose a course" });

export const createModuleSchema = z.object({
  course_id: objectId,
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30),
  description: z.string().trim().max(1000).optional().nullable(),
  sort_order: z.coerce.number().int().min(1).max(100).optional(),
  duration_hours: z.coerce.number().min(0).max(200).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export const updateModuleSchema = createModuleSchema.partial();

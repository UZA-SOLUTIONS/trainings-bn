import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, { message: "Choose a course" });

const contentSectionSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(20000).optional().nullable(),
  sort_order: z.coerce.number().int().min(1).max(200).optional(),
});

const attachmentSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().trim().min(1).max(200),
  mime_type: z.string().trim().min(3).max(120).optional().nullable(),
  size: z.coerce.number().int().min(1).max(3_000_000).optional().nullable(),
  /** Base64 payload; omit when keeping an existing attachment unchanged */
  data: z.string().min(1).max(4_200_000).optional().nullable(),
});

export const createModuleSchema = z.object({
  course_id: objectId,
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30),
  description: z.string().trim().max(2000).optional().nullable(),
  content: z.string().trim().max(100000).optional().nullable(),
  contents: z.array(contentSectionSchema).max(40).optional(),
  attachments: z.array(attachmentSchema).max(8).optional(),
  sort_order: z.coerce.number().int().min(1).max(100).optional(),
  duration_hours: z.coerce.number().min(0).max(200).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export const updateModuleSchema = createModuleSchema.partial();

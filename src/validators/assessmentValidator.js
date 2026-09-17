import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const createAssessmentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum(["quiz", "test", "exam"]),
  max_score: z.coerce.number().min(1).max(1000).optional().default(100),
  date: dateString,
  module_id: objectId.optional().nullable(),
  is_final: z.boolean().optional().default(false),
});

export const updateAssessmentSchema = createAssessmentSchema.partial();

export const upsertAssessmentScoresSchema = z.object({
  scores: z
    .array(
      z.object({
        candidate_id: objectId,
        score: z.coerce.number().min(0),
        remarks: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

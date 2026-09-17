import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const listIssuesQuerySchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  candidate_id: objectId.optional(),
});

export const createIssueSchema = z.object({
  candidate_id: objectId,
  category: z.enum(["academic", "conduct", "attendance", "health", "other"]),
  severity: z.enum(["low", "medium", "high"]).optional().default("medium"),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().nullable(),
});

export const createCandidateIssueSchema = createIssueSchema.omit({ candidate_id: true });

export const updateIssueSchema = z.object({
  category: z.enum(["academic", "conduct", "attendance", "health", "other"]).optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  resolution_notes: z.string().trim().max(4000).optional().nullable(),
});

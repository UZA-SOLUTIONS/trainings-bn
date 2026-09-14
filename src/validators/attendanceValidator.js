import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const listAttendanceSessionsSchema = z.object({
  date: dateString.optional(),
  session_label: z.enum(["full_day", "morning", "afternoon"]).optional(),
});

export const createAttendanceSessionSchema = z.object({
  date: dateString,
  session_label: z.enum(["full_day", "morning", "afternoon"]).optional().default("full_day"),
  activity_notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateAttendanceSessionSchema = z.object({
  activity_notes: z.string().trim().max(2000).optional().nullable(),
  session_label: z.enum(["full_day", "morning", "afternoon"]).optional(),
});

export const upsertAttendanceRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        candidate_id: objectId,
        status: z.enum(["present", "late", "absent", "excused"]),
        note: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

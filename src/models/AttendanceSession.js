import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema(
  {
    cohort_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      index: true,
    },
    date: { type: String, required: true },
    session_label: {
      type: String,
      enum: ["full_day", "morning", "afternoon"],
      default: "full_day",
    },
    activity_notes: { type: String, default: null },
    recorded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffUser",
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

attendanceSessionSchema.index({ cohort_id: 1, date: 1, session_label: 1 }, { unique: true });

export const AttendanceSession = mongoose.model("AttendanceSession", attendanceSessionSchema);

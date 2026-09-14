import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    session_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
      index: true,
    },
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["present", "late", "absent", "excused"],
      required: true,
    },
    note: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

attendanceRecordSchema.index({ session_id: 1, candidate_id: 1 }, { unique: true });

export const AttendanceRecord = mongoose.model("AttendanceRecord", attendanceRecordSchema);

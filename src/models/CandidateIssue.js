import mongoose from "mongoose";

const candidateIssueSchema = new mongoose.Schema(
  {
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    cohort_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      index: true,
    },
    reported_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffUser",
      default: null,
    },
    category: {
      type: String,
      enum: ["academic", "conduct", "attendance", "health", "other"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
      index: true,
    },
    resolution_notes: { type: String, default: null },
    resolved_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const CandidateIssue = mongoose.model("CandidateIssue", candidateIssueSchema);

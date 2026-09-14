import mongoose from "mongoose";

const assessmentScoreSchema = new mongoose.Schema(
  {
    assessment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0 },
    remarks: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

assessmentScoreSchema.index({ assessment_id: 1, candidate_id: 1 }, { unique: true });

export const AssessmentScore = mongoose.model("AssessmentScore", assessmentScoreSchema);

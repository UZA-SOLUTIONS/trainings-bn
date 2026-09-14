import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    cohort_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["quiz", "test", "exam"],
      required: true,
    },
    max_score: { type: Number, required: true, min: 1, default: 100 },
    date: { type: String, required: true },
    module_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrainingModule",
      default: null,
    },
    is_final: { type: Boolean, default: false },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffUser",
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

assessmentSchema.index({ cohort_id: 1, date: -1 });

export const Assessment = mongoose.model("Assessment", assessmentSchema);

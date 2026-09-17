import mongoose from "mongoose";

const cohortSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    capacity: { type: Number, required: true, default: 30, min: 1 },
    location: { type: String, default: null },
    start_date: { type: String, default: null },
    end_date: { type: String, default: null },
    applications_open: { type: Boolean, default: true },
    partner_bank: { type: String, default: null },
    institution_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancingInstitution",
      default: null,
      index: true,
    },
    notes: { type: String, default: null },
    kind: {
      type: String,
      enum: ["uza", "institution"],
      default: "uza",
      index: true,
    },
    target_school_code: { type: String, default: null, trim: true, lowercase: true },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const Cohort = mongoose.model("Cohort", cohortSchema);

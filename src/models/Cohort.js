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
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const Cohort = mongoose.model("Cohort", cohortSchema);

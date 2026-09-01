import mongoose from "mongoose";

const consentSchema = new mongoose.Schema(
  {
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    candidate_code: { type: String, required: true, uppercase: true, trim: true, index: true },
    institution_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FinancingInstitution",
      required: true,
      index: true,
    },
    granted_at: { type: Date, required: true, default: Date.now },
    withdrawn_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

consentSchema.index({ candidate_id: 1, institution_id: 1 }, { unique: true });

export const BorrowerLenderConsent = mongoose.model("BorrowerLenderConsent", consentSchema);

import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    actor_id: { type: mongoose.Schema.Types.ObjectId, ref: "StaffUser", required: true },
    actor_email: { type: String, required: true },
    institution_id: { type: mongoose.Schema.Types.ObjectId, ref: "FinancingInstitution", required: true },
    candidate_code: { type: String, default: null },
    outcome: { type: String, enum: ["allowed", "denied"], required: true },
    internal_reason: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } },
);

auditSchema.index({ created_at: -1 });
auditSchema.index({ candidate_code: 1, institution_id: 1 });

export const LenderReadAudit = mongoose.model("LenderReadAudit", auditSchema);

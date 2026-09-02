import mongoose from "mongoose";

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    /** Public track ID for bank partners — e.g. UZA-BANK-2026-00001 */
    bank_id: { type: String, unique: true, sparse: true, uppercase: true, trim: true, index: true },
    target_program: { type: String, required: true, default: "tunga_taxi" },
    is_default_for_program: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    rate_tiers: {
      type: [{ max_years: Number, annual_rate: Number }],
      default: [
        { max_years: 3, annual_rate: 0.34 },
        { max_years: 5, annual_rate: 0.36 },
      ],
    },
    deposit_tiers: {
      type: [{ max_price_rwf: { type: Number, default: null }, percent: Number }],
      default: [
        { max_price_rwf: 25000000, percent: 0.1 },
        { max_price_rwf: null, percent: 0.15 },
      ],
    },
    min_client_contribution_rwf: { type: Number, default: 500000 },
    collateral_percent: { type: Number, default: 0.3 },
    equity_release_percent: { type: Number, default: 0.9 },
    min_term_years: { type: Number, default: 1 },
    max_term_years: { type: Number, default: 5 },
    processing_fee_percent: { type: Number, default: 0 },
    insurance_percent_per_year: { type: Number, default: 0 },
    supports_uza_access_topup: { type: Boolean, default: true },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const FinancingInstitution = mongoose.model(
  "FinancingInstitution",
  institutionSchema,
);

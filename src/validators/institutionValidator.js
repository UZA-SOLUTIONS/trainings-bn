import { z } from "zod";

const rateTierSchema = z.array(
  z.object({
    max_years: z.coerce.number().min(1).max(20),
    annual_rate: z.coerce.number().min(0).max(1),
  }),
);

const depositTierSchema = z.array(
  z.object({
    max_price_rwf: z.coerce.number().nullable(),
    percent: z.coerce.number().min(0).max(1),
  }),
);

export const createInstitutionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(30),
  target_program: z.string().trim().min(1).max(60),
  is_default_for_program: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  rate_tiers: rateTierSchema,
  deposit_tiers: depositTierSchema,
  min_client_contribution_rwf: z.coerce.number().min(0),
  collateral_percent: z.coerce.number().min(0).max(1),
  equity_release_percent: z.coerce.number().min(0).max(1),
  min_term_years: z.coerce.number().int().min(1).max(20),
  max_term_years: z.coerce.number().int().min(1).max(20),
  processing_fee_percent: z.coerce.number().min(0).max(1),
  insurance_percent_per_year: z.coerce.number().min(0).max(1),
  supports_uza_access_topup: z.boolean().optional().default(true),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateInstitutionSchema = createInstitutionSchema.partial();

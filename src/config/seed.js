import { Cohort } from "../models/Cohort.js";
import { FinancingInstitution } from "../models/FinancingInstitution.js";

const DEFAULT_COHORTS = [
  {
    name: "Tunga Taxi Cohort 1 — Kigali",
    code: "TT-KGL-01",
    capacity: 30,
    location: "Kigali, Nyarugenge",
    start_date: "2026-08-10",
    end_date: "2026-09-04",
    applications_open: true,
    partner_bank: "Unguka Bank",
    notes: "Pre-qualified cohort for Unguka Bank financing.",
  },
  {
    name: "Tunga Taxi Cohort 2 — Kigali",
    code: "TT-KGL-02",
    capacity: 30,
    location: "Kigali, Kicukiro",
    start_date: "2026-09-14",
    end_date: "2026-10-09",
    applications_open: true,
    partner_bank: "Unguka Bank",
    notes: "Second intake, applications open.",
  },
  {
    name: "Tunga Taxi Cohort 3 — Musanze",
    code: "TT-MSZ-01",
    capacity: 25,
    location: "Musanze",
    start_date: "2026-10-19",
    end_date: "2026-11-13",
    applications_open: false,
    partner_bank: null,
    notes: "Upcountry pilot intake, opens later.",
  },
];

const DEFAULT_INSTITUTIONS = [
  {
    name: "Unguka Bank",
    code: "UNGUKA",
    target_program: "tunga_taxi",
    is_default_for_program: true,
    rate_tiers: [
      { max_years: 3, annual_rate: 0.34 },
      { max_years: 5, annual_rate: 0.36 },
    ],
    deposit_tiers: [
      { max_price_rwf: 25000000, percent: 0.1 },
      { max_price_rwf: null, percent: 0.15 },
    ],
    min_client_contribution_rwf: 500000,
    collateral_percent: 0.3,
    equity_release_percent: 0.9,
    min_term_years: 1,
    max_term_years: 5,
    processing_fee_percent: 0.02,
    insurance_percent_per_year: 0.04,
    supports_uza_access_topup: true,
    notes:
      "Default lender for Tunga Taxi taxi-driver EV ownership. Reducing balance, collateral released at 90% equity.",
  },
  {
    name: "NCBA Rwanda",
    code: "NCBA",
    target_program: "fleet_partners",
    is_default_for_program: true,
    rate_tiers: [
      { max_years: 2, annual_rate: 0.19 },
      { max_years: 4, annual_rate: 0.21 },
      { max_years: 6, annual_rate: 0.23 },
    ],
    deposit_tiers: [
      { max_price_rwf: 40000000, percent: 0.2 },
      { max_price_rwf: null, percent: 0.25 },
    ],
    min_client_contribution_rwf: 2000000,
    collateral_percent: 0.35,
    equity_release_percent: 0.9,
    min_term_years: 1,
    max_term_years: 6,
    processing_fee_percent: 0.015,
    insurance_percent_per_year: 0.035,
    supports_uza_access_topup: false,
    notes: "Fleet and corporate partners. Higher deposit, lower rate, no UZA Access top-up.",
  },
  {
    name: "Bank of Kigali",
    code: "BK",
    target_program: "individual_buyers",
    is_default_for_program: true,
    rate_tiers: [
      { max_years: 3, annual_rate: 0.16 },
      { max_years: 5, annual_rate: 0.18 },
    ],
    deposit_tiers: [{ max_price_rwf: null, percent: 0.2 }],
    min_client_contribution_rwf: 3000000,
    collateral_percent: 0.4,
    equity_release_percent: 0.9,
    min_term_years: 1,
    max_term_years: 5,
    processing_fee_percent: 0.01,
    insurance_percent_per_year: 0.03,
    supports_uza_access_topup: false,
    notes: "Salaried individual buyers with payroll deduction.",
  },
];

/** Seeds default cohorts and banks once when collections are empty. */
export async function seedIfEmpty() {
  const cohortCount = await Cohort.countDocuments();
  if (cohortCount === 0) {
    await Cohort.insertMany(DEFAULT_COHORTS);
    console.log(`Seeded ${DEFAULT_COHORTS.length} cohorts`);
  }

  const institutionCount = await FinancingInstitution.countDocuments();
  if (institutionCount === 0) {
    await FinancingInstitution.insertMany(DEFAULT_INSTITUTIONS);
    console.log(`Seeded ${DEFAULT_INSTITUTIONS.length} financing institutions`);
  }
}

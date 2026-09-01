import bcrypt from "bcryptjs";
import { Cohort } from "../models/Cohort.js";
import { FinancingInstitution } from "../models/FinancingInstitution.js";
import { StaffUser } from "../models/StaffUser.js";
import { env } from "./env.js";
import { migrateInstitutionLinks } from "./migrate.js";
import { seedConsentsForInstitution } from "../services/lenderFileService.js";

const DEFAULT_STAFF = [
  {
    email: "admin@uza.rw",
    full_name: "UZA Programme Admin",
    role: "admin",
    institution_code: null,
  },
  {
    email: "instructor@uza.rw",
    full_name: "Tunga Taxi Instructor",
    role: "instructor",
    institution_code: null,
  },
  {
    email: "partner@unguka.rw",
    full_name: "Unguka Bank Partner",
    role: "bank_partner",
    institution_code: "UNGUKA",
  },
];

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
  let ungukaId = null;

  const institutionCount = await FinancingInstitution.countDocuments();
  if (institutionCount === 0) {
    const inserted = await FinancingInstitution.insertMany(DEFAULT_INSTITUTIONS);
    console.log(`Seeded ${DEFAULT_INSTITUTIONS.length} financing institutions`);
    ungukaId = inserted.find((i) => i.code === "UNGUKA")?._id ?? null;
  } else {
    const unguka = await FinancingInstitution.findOne({ code: "UNGUKA" }).lean();
    ungukaId = unguka?._id ?? null;
  }

  const cohortCount = await Cohort.countDocuments();
  if (cohortCount === 0) {
    const cohorts = DEFAULT_COHORTS.map((c) => ({
      ...c,
      institution_id:
        c.partner_bank === "Unguka Bank" && ungukaId ? ungukaId : null,
    }));
    await Cohort.insertMany(cohorts);
    console.log(`Seeded ${DEFAULT_COHORTS.length} cohorts`);
  }

  await migrateInstitutionLinks();
  await seedStaffIfMissing(ungukaId);

  if (ungukaId) {
    const consents = await seedConsentsForInstitution(ungukaId);
    if (consents > 0) {
      console.log(`Seeded ${consents} borrower–lender consent record(s) for Unguka Bank`);
    }
  }
}

/** Creates default staff accounts when their email is not already taken. */
export async function seedStaffIfMissing(ungukaId) {
  const password_hash = await bcrypt.hash(env.SEED_STAFF_PASSWORD, 12);
  let created = 0;

  for (const entry of DEFAULT_STAFF) {
    const email = entry.email.toLowerCase().trim();
    const existing = await StaffUser.findOne({ email }).lean();
    if (existing) continue;

    let institution_id = null;
    if (entry.role === "bank_partner") {
      if (!ungukaId) {
        console.warn(
          `Skipped seed staff ${email}: Unguka institution not found for bank_partner`,
        );
        continue;
      }
      institution_id = ungukaId;
    }

    await StaffUser.create({
      email,
      password_hash,
      full_name: entry.full_name,
      role: entry.role,
      institution_id,
    });
    console.log(`Seeded staff: ${email} (${entry.role})`);
    created += 1;
  }

  if (created === 0) {
    console.log("Staff seed: all default accounts already exist");
  }
}

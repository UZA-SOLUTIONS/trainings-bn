import bcrypt from "bcryptjs";
import { Cohort } from "../models/Cohort.js";
import { FinancingInstitution } from "../models/FinancingInstitution.js";
import { StaffUser } from "../models/StaffUser.js";
import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { env } from "./env.js";
import { migrateInstitutionLinks } from "./migrate.js";
import { ensureBankIds } from "../services/institutionService.js";
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

const DEFAULT_COURSES = [
  {
    name: "Tunga Taxi EV Driver Programme",
    code: "TT-EV-CORE",
    description: "Core training for taxi drivers entering the EV ownership programme.",
    duration_weeks: 4,
    status: "active",
    modules: [
      {
        name: "Programme orientation & safety",
        code: "M01",
        description: "Welcome, programme rules, road safety basics, and EV awareness.",
        content:
          "This opening module introduces the Tunga Taxi programme, classroom and road expectations, and foundational EV safety habits before drivers move into vehicle operations.",
        contents: [
          {
            title: "Welcome & programme rules",
            body: "Overview of UZA Mobility, cohort schedule, attendance, and conduct expectations.",
            sort_order: 1,
          },
          {
            title: "Road safety basics",
            body: "Defensive driving refreshers for Kigali traffic, fatigue management, and passenger safety.",
            sort_order: 2,
          },
          {
            title: "EV awareness",
            body: "How EVs differ from ICE vehicles: torque, quiet operation, and high-voltage caution zones.",
            sort_order: 3,
          },
        ],
        sort_order: 1,
        duration_hours: 8,
      },
      {
        name: "EV vehicle operations",
        code: "M02",
        description: "Charging, range management, daily checks, and passenger service.",
        content:
          "Hands-on module covering daily vehicle readiness, charging strategy, range planning, and professional passenger service in an EV taxi.",
        contents: [
          {
            title: "Daily checks & cabin readiness",
            body: "Walk-around, tyre pressure, cabin cleanliness, and pre-trip digital checks.",
            sort_order: 1,
          },
          {
            title: "Charging & range management",
            body: "AC/DC charging etiquette, state-of-charge targets, and planning shifts around range.",
            sort_order: 2,
          },
          {
            title: "Passenger service",
            body: "Greeting, route confirmation, accessibility considerations, and end-of-trip handover.",
            sort_order: 3,
          },
        ],
        sort_order: 2,
        duration_hours: 16,
      },
      {
        name: "Business & financing readiness",
        code: "M03",
        description: "Earnings, savings, deposit planning, and loan-file readiness.",
        content:
          "Drivers learn how training connects to financing: projecting earnings, building a deposit, and preparing a complete loan file with partner banks.",
        contents: [
          {
            title: "Earnings & savings plan",
            body: "Trip economics, weekly targets, and building the required client contribution.",
            sort_order: 1,
          },
          {
            title: "Loan-file readiness",
            body: "Documents, disclosures, and what partner banks review before approval.",
            sort_order: 2,
          },
        ],
        sort_order: 3,
        duration_hours: 8,
      },
      {
        name: "Assessment & graduation",
        code: "M04",
        description: "Practical assessment, exam, and graduation checklist.",
        content:
          "Final practical and written assessment covering safety, EV operations, and financing readiness. Successful drivers graduate into the financing pipeline.",
        contents: [
          {
            title: "Practical assessment",
            body: "Observed drive, charging demo, and passenger-service checklist.",
            sort_order: 1,
          },
          {
            title: "Written exam & graduation",
            body: "Short exam, score review, and graduation / next-step briefing.",
            sort_order: 2,
          },
        ],
        sort_order: 4,
        duration_hours: 8,
      },
    ],
  },
  {
    name: "Customer service & professionalism",
    code: "TT-SVC",
    description: "Soft skills for professional taxi service in Kigali.",
    duration_weeks: 1,
    status: "active",
    modules: [
      {
        name: "Passenger experience",
        code: "S01",
        description: "Greeting, routing, accessibility, and conflict handling.",
        content:
          "Soft-skills module focused on professional taxi service: first impressions, clear routing, accessibility, and calm conflict handling.",
        contents: [
          {
            title: "Greeting & first impressions",
            body: "Cabin presentation, greeting scripts, and confirming destination politely.",
            sort_order: 1,
          },
          {
            title: "Accessibility & conflict handling",
            body: "Supporting passengers with mobility needs and de-escalating fare or route disputes.",
            sort_order: 2,
          },
        ],
        sort_order: 1,
        duration_hours: 6,
      },
      {
        name: "Digital tools & payments",
        code: "S02",
        description: "App usage, cashless payments, and trip records.",
        content:
          "Practical training on trip apps, cashless payments, and keeping accurate digital records for financing partners.",
        contents: [
          {
            title: "App usage",
            body: "Accepting trips, navigation basics, and reporting issues in-app.",
            sort_order: 1,
          },
          {
            title: "Payments & trip records",
            body: "Cashless flows, receipts, and why clean trip history matters for financing.",
            sort_order: 2,
          },
        ],
        sort_order: 2,
        duration_hours: 4,
      },
    ],
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
  const bankIdsAssigned = await ensureBankIds();
  if (bankIdsAssigned > 0) {
    console.log(`Assigned bank ID to ${bankIdsAssigned} institution(s)`);
  }
  await seedStaffIfMissing(ungukaId);
  await seedCoursesIfEmpty();

  if (ungukaId) {
    const consents = await seedConsentsForInstitution(ungukaId);
    if (consents > 0) {
      console.log(`Seeded ${consents} borrower–lender consent record(s) for Unguka Bank`);
    }
  }
}

/** Seeds default courses and modules when the courses collection is empty. */
export async function seedCoursesIfEmpty() {
  const courseCount = await Course.countDocuments();
  if (courseCount > 0) {
    console.log("Course seed: courses already exist");
    return;
  }

  let moduleTotal = 0;
  for (const entry of DEFAULT_COURSES) {
    const { modules, ...courseFields } = entry;
    const course = await Course.create(courseFields);
    if (modules?.length) {
      await TrainingModule.insertMany(
        modules.map((m) => ({
          ...m,
          course_id: course._id,
          status: "active",
        })),
      );
      moduleTotal += modules.length;
    }
  }
  console.log(`Seeded ${DEFAULT_COURSES.length} courses and ${moduleTotal} modules`);
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

/**
 * Seed Cohort I (TT-KGL-01) with the ready-driver shortlist.
 * Usage: node src/scripts/seedCohort1Candidates.js
 *
 * Idempotent by phone within the cohort — re-running skips existing phones.
 */
import { connectDatabase } from "../config/database.js";
import { Cohort } from "../models/Cohort.js";
import { Candidate } from "../models/Candidate.js";
import { nextCandidateSequence, formatCandidateCode } from "../models/Counter.js";

/** @type {{ date: string, name: string, ev: string, contribution: string, price: string, phone: string }[]} */
const ROWS = [
  { date: "20/08/2026", name: "TUYISENGE Gisele", ev: "NETA U 2023", contribution: "1.5M", price: "23.5M", phone: "786943123" },
  { date: "10/08/2026", name: "CYUBAHIRO Charite", ev: "NETA U 2023", contribution: "1.5M", price: "23.5M", phone: "788660491" },
  { date: "06/06/2026", name: "EMMANUEL UWIZEYIMANA", ev: "Dongfeng E70 2023, September", contribution: "500K", price: "18.5M", phone: "787613076" },
  { date: "29/06/2026", name: "BUSHAIJA Blaise", ev: "BYD Yuan Plus 2023, October", contribution: "500K", price: "28.5M", phone: "788611098" },
  { date: "03/07/2026", name: "HAFASHIMANA Emmanuel", ev: "BYD Yuan Up 2024 Full option, September", contribution: "1M", price: "29.8M", phone: "789752852" },
  { date: "03/06/2026", name: "NDAYAMBAJE VEDASTE", ev: "BYD Yuan Plus 2025, October", contribution: "1M", price: "31.5M", phone: "788592350" },
  { date: "18/06/2026", name: "NIYONZIMA ERIC", ev: "NETA U PRO 2022 September", contribution: "1M", price: "22.8M", phone: "789526485" },
  { date: "05/06/2026", name: "MUGABO RASHID", ev: "BYD Yuan Plus 2025, October", contribution: "1.5M", price: "31.5M", phone: "788506578" },
  { date: "12/08/2026", name: "HABIMANA Jean Pierre", ev: "BYD Yuan Up 2025, Full option, October", contribution: "1M", price: "31.5M", phone: "788359703" },
  { date: "12/08/2026", name: "HABANIMFURA Celestin", ev: "BYD Yuan Up 2025, Full Option 2025 September", contribution: "2M", price: "31.5M", phone: "788852087" },
  { date: "14/06/2026", name: "TURINZWENIMANA Bosco", ev: "NETA U 2022, September", contribution: "500K", price: "22.8M", phone: "781720701" },
  { date: "02/07/2026", name: "UWIMANA Fred", ev: "Dongfeng E70 2023 October", contribution: "500K", price: "18.5M", phone: "788741210" },
  { date: "25/06/2026", name: "MUSABYIMANA John", ev: "NETA U 2022, September", contribution: "500K", price: "22.8M", phone: "788235722" },
  { date: "22/06/2026", name: "KARENZI Noel", ev: "BYD Yuan Up 2025 Basic, September", contribution: "1M", price: "30.8M", phone: "788226247" },
  { date: "08/08/2026", name: "NIZEYIMANA Janvier", ev: "BYD Yuan Up 2025, Full option, October", contribution: "2M", price: "31.5M", phone: "787056547" },
  { date: "12/08/2026", name: "NSIGAYEHE Gilbert", ev: "BYD Yuan Plus 2024 Basic - September", contribution: "500K", price: "29.2M", phone: "783670326" },
  { date: "12/07/2026", name: "MIZERO Protais", ev: "BYD Yuan Plus 2025, October", contribution: "500K", price: "31M", phone: "782722250" },
  { date: "22/07/2026", name: "NZEYIMANA Emmanuel", ev: "BYD Yuan Up 2025, Full option, September", contribution: "1.5M", price: "31.5M", phone: "783308924" },
  { date: "12/08/2026", name: "NKESHIMANA Marc", ev: "AION V Plus 2023 7 seats", contribution: "1M", price: "30M", phone: "783664264" },
  { date: "11/07/2026", name: "HAKIZIMANA ALEX", ev: "NETA U PRO 2022 September", contribution: "500K", price: "22.8M", phone: "780759619" },
  { date: "04/07/2026", name: "Munezero Alphonse", ev: "BYD Yuan Plus 2023, October", contribution: "1.5M", price: "28.5M", phone: "788445560" },
  { date: "06/06/2026", name: "NIYOYITA Jean Paul", ev: "BYD SONG Plus 2023 or 2024", contribution: "1M", price: "—", phone: "788781763" },
  { date: "12/08/2026", name: "SHYAKA Aimable", ev: "BYD Yuan Up 2025, Full option, October", contribution: "1M", price: "31.5M", phone: "788536423" },
  { date: "10/07/2026", name: "MPORAYONZI Vedaste", ev: "BYD Yuan Up 2025, Full option, September", contribution: "500K", price: "31.5M", phone: "789921038" },
  { date: "13/08/2026", name: "HAHAGAZINTWARI Eugene", ev: "AION V Plus 2023 7 Seats, October", contribution: "1M", price: "30M", phone: "788775059" },
  { date: "18/06/2026", name: "NDAGIJIMANA Innocent", ev: "BYD Yuan Plus 2024, October", contribution: "1M", price: "29.5M", phone: "788252428" },
  { date: "14/08/2026", name: "MURENZI Ildephonse", ev: "BYD SONG Plus 2023 or 2024", contribution: "2M", price: "—", phone: "785201233" },
  { date: "20/07/2026", name: "Ndayisenga Dominique", ev: "Dongfeng E70 2023, October", contribution: "500K", price: "18.5M", phone: "790550428" },
  { date: "17/08/2026", name: "RUGABA Henry Mark", ev: "NETA U Pro 2023, October", contribution: "500K", price: "23.5M", phone: "788776045" },
  { date: "19/08/2026", name: "AHISHAKIYE Amur", ev: "BYD Yuan Plus 2024, October", contribution: "1M", price: "29.5M", phone: "788770876" },
  { date: "17/08/2026", name: "NYINAWUMUNTU ROSEMARY", ev: "BYD Yuan Up 2024, Full Option 2024 September", contribution: "1M", price: "29.8M", phone: "788597303" },
  { date: "04/07/2026", name: "GASORE Egide", ev: "BYD Yuan Up 2024, October", contribution: "500K", price: "29.5M", phone: "785086198" },
  { date: "07/06/2026", name: "NIZEYIMANA ABDUL KARIM", ev: "Dongfeng E70 2023, October", contribution: "500K", price: "18.5M", phone: "785762697" },
  { date: "10/07/2026", name: "TUYISENGE JEAN CLAUDE 2", ev: "Dongfeng E70 2023 October", contribution: "500K", price: "18.5M", phone: "790363974" },
  { date: "08/07/2026", name: "NKIKABAHIZI Joseph", ev: "BYD Yuan Up 2024 Full option, September", contribution: "2M", price: "29.8M", phone: "788825856" },
  { date: "24/08/2026", name: "UWAMARAYIKA VENUSTE", ev: "Dongfeng E70 2023, October", contribution: "1M", price: "18.5M", phone: "788211837" },
  { date: "02/08/2026", name: "KABUKIRE Eric", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "784945500" },
  { date: "02/08/2026", name: "KABUKIRE Aime", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "788864119" },
  { date: "23/06/2026", name: "TUYISENGE JEAN CLAUDE", ev: "BYD Yuan Up 2025 Basic, October", contribution: "2M", price: "30.8M", phone: "786661346" },
  { date: "16/08/2026", name: "KASIRE Gratien", ev: "BYD Yuan Plus 2023, October", contribution: "500K", price: "28.5M", phone: "784417321" },
  { date: "16/08/2026", name: "NGIRINSHUTI Damascene", ev: "Dongfeng E70 2023, October", contribution: "1M", price: "18.5M", phone: "788372952" },
  { date: "28/07/2026", name: "NDAYISENGA Emmanuel", ev: "Wuling EV 730 - 7 Seats 2023", contribution: "2M", price: "—", phone: "733800284" },
  { date: "01/09/2026", name: "RUTAYISIRE Bosco", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "785040266" },
  { date: "05/06/2026", name: "ITEGEKWANANDE PIERRE", ev: "BYD Yuan Up 2024, Full Option October", contribution: "1M", price: "29.5M", phone: "788610839" },
  { date: "28/08/2026", name: "ICYOYISHAKIYE Dieudonne", ev: "BYD E2 2023", contribution: "1M", price: "—", phone: "788491388" },
  { date: "11/06/2026", name: "IRAKOZE Jean Viateur", ev: "Dongfeng E70 2023", contribution: "500K", price: "18.5M", phone: "785312245" },
  { date: "01/09/2026", name: "MUNYANEZA Celestin", ev: "BYD Yuan Up 2024, Full Option October", contribution: "1M", price: "29.8M", phone: "788871413" },
  { date: "01/09/2026", name: "TUYIRINGIRE Jean Paul", ev: "Dongfeng E70 2023", contribution: "1M", price: "18.5M", phone: "788203558" },
  { date: "29/06/2026", name: "SHEBA KAGABO", ev: "Dongfeng Venucia Sedan 2023", contribution: "1M", price: "—", phone: "788897577" },
  { date: "01/09/2026", name: "MUVUNYI Johnson", ev: "Neta U Pro 2023", contribution: "500K", price: "23.5M", phone: "788816959" },
  { date: "01/09/2026", name: "NGOGA ABDOUL", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "788633531" },
];

function parseMoney(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/,/g, "");
  if (!s || s === "—" || s === "-" || s.toLowerCase() === "n/a") return null;
  const m = s.match(/^([\d.]+)\s*([MmKk])?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || "").toUpperCase();
  if (unit === "M") return Math.round(n * 1_000_000);
  if (unit === "K") return Math.round(n * 1_000);
  return Math.round(n);
}

function formatPhone(raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("7")) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("07")) return digits;
  if (digits.length === 12 && digits.startsWith("250")) return `0${digits.slice(3)}`;
  return digits;
}

/** dd/mm/yyyy → Date at noon UTC */
function parseAppliedAt(raw) {
  const [dd, mm, yyyy] = String(raw).split("/").map((p) => Number(p));
  if (!dd || !mm || !yyyy) return new Date();
  return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
}

function titleCaseName(name) {
  return String(name)
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (/^\d+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

async function main() {
  await connectDatabase();

  const cohort = await Cohort.findOne({ code: "TT-KGL-01" });
  if (!cohort) {
    throw new Error('Cohort TT-KGL-01 ("Tunga Taxi Cohort 1 — Kigali") not found. Run the backend once so seed creates it.');
  }

  const neededCapacity = Math.max(cohort.capacity || 0, ROWS.length + 10);
  if (cohort.capacity < neededCapacity || !cohort.applications_open) {
    cohort.capacity = neededCapacity;
    cohort.applications_open = true;
    await cohort.save();
    console.log(`Updated cohort capacity → ${neededCapacity}, applications_open → true`);
  }

  console.log(`Seeding ${ROWS.length} candidates into ${cohort.name} (${cohort.code})…`);

  let created = 0;
  let skipped = 0;
  const results = [];

  for (let i = 0; i < ROWS.length; i++) {
    const row = ROWS[i];
    const phone = formatPhone(row.phone);
    const phoneVariants = [phone, row.phone, phone.replace(/^0/, "")];

    const existing = await Candidate.findOne({
      cohort_id: cohort._id,
      phone: { $in: phoneVariants },
    });
    if (existing) {
      skipped += 1;
      results.push({
        n: i + 1,
        action: "skip",
        code: existing.candidate_code,
        name: existing.full_name,
        phone,
      });
      continue;
    }

    const deposit = parseMoney(row.contribution) ?? 0;
    const price = parseMoney(row.price);
    const nationalId = `SEED-C1-${String(i + 1).padStart(3, "0")}-${phone.slice(-6)}`;
    const seq = await nextCandidateSequence();
    const candidate_code = formatCandidateCode(seq);

    const doc = await Candidate.create({
      candidate_code,
      cohort_id: cohort._id,
      status: "enrolled",
      waitlist_position: null,
      full_name: titleCaseName(row.name),
      national_id: nationalId,
      date_of_birth: "1990-01-01",
      gender: "Prefer not to say",
      phone,
      email: null,
      district: "Kigali",
      sector: "",
      cell: "",
      education_level: "",
      preferred_language: "Kinyarwanda",
      has_smartphone: true,
      driving_license_number: `SEED-DL-${phone.slice(-6)}`,
      years_driving_experience: 5,
      currently_driving_for: "Tunga Taxi",
      monthly_income_rwf: 400000,
      average_daily_earnings_rwf: 15000,
      has_bank_account: true,
      bank_name: "Unguka Bank",
      deposit_available_rwf: deposit,
      needs_uza_access_support: deposit < 500000,
      preferred_term_years: 3,
      preferred_financing: "Bank financed",
      marital_status: "Single",
      target_vehicle_name: row.ev,
      target_vehicle_price_rwf: price ?? 0,
      instructor_notes: `EV of Choice: ${row.ev}`,
      bank_notes: `Shortlist #${i + 1} · Contribution ${row.contribution} · Price ${row.price}`,
      training_status: "not_started",
      loan_review_status: "pending",
      applied_at: parseAppliedAt(row.date),
    });

    created += 1;
    results.push({
      n: i + 1,
      action: "created",
      code: doc.candidate_code,
      name: doc.full_name,
      phone,
      deposit,
      price: price ?? null,
      ev: row.ev,
    });
    console.log(`  ✓ ${doc.candidate_code}  ${doc.full_name}  (${phone})`);
  }

  console.log("\nDone.");
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (already present): ${skipped}`);
  console.log(`  Cohort: ${cohort.code} · capacity ${cohort.capacity}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

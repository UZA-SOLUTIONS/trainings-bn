/**
 * Sync EV of choice (+ price, deposit) onto candidates from the Cohort 1 shortlist.
 * Matches by phone digits. Usage: node src/scripts/syncEvOfChoice.js
 */
import { connectDatabase } from "../config/database.js";
import { Candidate } from "../models/Candidate.js";

/** Same list as seedCohort1Candidates.js */
const ROWS = [
  { name: "TUYISENGE Gisele", ev: "NETA U 2023", contribution: "1.5M", price: "23.5M", phone: "786943123" },
  { name: "CYUBAHIRO Charite", ev: "NETA U 2023", contribution: "1.5M", price: "23.5M", phone: "788660491" },
  { name: "EMMANUEL UWIZEYIMANA", ev: "Dongfeng E70 2023, September", contribution: "500K", price: "18.5M", phone: "787613076" },
  { name: "BUSHAIJA Blaise", ev: "BYD Yuan Plus 2023, October", contribution: "500K", price: "28.5M", phone: "788611098" },
  { name: "HAFASHIMANA Emmanuel", ev: "BYD Yuan Up 2024 Full option, September", contribution: "1M", price: "29.8M", phone: "789752852" },
  { name: "NDAYAMBAJE VEDASTE", ev: "BYD Yuan Plus 2025, October", contribution: "1M", price: "31.5M", phone: "788592350" },
  { name: "NIYONZIMA ERIC", ev: "NETA U PRO 2022 September", contribution: "1M", price: "22.8M", phone: "789526485" },
  { name: "MUGABO RASHID", ev: "BYD Yuan Plus 2025, October", contribution: "1.5M", price: "31.5M", phone: "788506578" },
  { name: "HABIMANA Jean Pierre", ev: "BYD Yuan Up 2025, Full option, October", contribution: "1M", price: "31.5M", phone: "788359703" },
  { name: "HABANIMFURA Celestin", ev: "BYD Yuan Up 2025, Full Option 2025 September", contribution: "2M", price: "31.5M", phone: "788852087" },
  { name: "TURINZWENIMANA Bosco", ev: "NETA U 2022, September", contribution: "500K", price: "22.8M", phone: "781720701" },
  { name: "UWIMANA Fred", ev: "Dongfeng E70 2023 October", contribution: "500K", price: "18.5M", phone: "788741210" },
  { name: "MUSABYIMANA John", ev: "NETA U 2022, September", contribution: "500K", price: "22.8M", phone: "788235722" },
  { name: "KARENZI Noel", ev: "BYD Yuan Up 2025 Basic, September", contribution: "1M", price: "30.8M", phone: "788226247" },
  { name: "NIZEYIMANA Janvier", ev: "BYD Yuan Up 2025, Full option, October", contribution: "2M", price: "31.5M", phone: "787056547" },
  { name: "NSIGAYEHE Gilbert", ev: "BYD Yuan Plus 2024 Basic - September", contribution: "500K", price: "29.2M", phone: "783670326" },
  { name: "MIZERO Protais", ev: "BYD Yuan Plus 2025, October", contribution: "500K", price: "31M", phone: "782722250" },
  { name: "NZEYIMANA Emmanuel", ev: "BYD Yuan Up 2025, Full option, September", contribution: "1.5M", price: "31.5M", phone: "783308924" },
  { name: "NKESHIMANA Marc", ev: "AION V Plus 2023 7 seats", contribution: "1M", price: "30M", phone: "783664264" },
  { name: "HAKIZIMANA ALEX", ev: "NETA U PRO 2022 September", contribution: "500K", price: "22.8M", phone: "780759619" },
  { name: "Munezero Alphonse", ev: "BYD Yuan Plus 2023, October", contribution: "1.5M", price: "28.5M", phone: "788445560" },
  { name: "NIYOYITA Jean Paul", ev: "BYD SONG Plus 2023 or 2024", contribution: "1M", price: "30M", phone: "788781763" },
  { name: "SHYAKA Aimable", ev: "BYD Yuan Up 2025, Full option, October", contribution: "1M", price: "31.5M", phone: "788536423" },
  { name: "MPORAYONZI Vedaste", ev: "BYD Yuan Up 2025, Full option, September", contribution: "500K", price: "31.5M", phone: "789921038" },
  { name: "HAHAGAZINTWARI Eugene", ev: "AION V Plus 2023 7 Seats, October", contribution: "1M", price: "30M", phone: "788775059" },
  { name: "NDAGIJIMANA Innocent", ev: "BYD Yuan Plus 2024, October", contribution: "1M", price: "29.5M", phone: "788252428" },
  { name: "MURENZI Ildephonse", ev: "BYD SONG Plus 2023 or 2024", contribution: "2M", price: "30M", phone: "785201233" },
  { name: "Ndayisenga Dominique", ev: "Dongfeng E70 2023, October", contribution: "500K", price: "18.5M", phone: "790550428" },
  { name: "RUGABA Henry Mark", ev: "NETA U Pro 2023, October", contribution: "500K", price: "23.5M", phone: "788776045" },
  { name: "AHISHAKIYE Amur", ev: "BYD Yuan Plus 2024, October", contribution: "1M", price: "29.5M", phone: "788770876" },
  { name: "NYINAWUMUNTU ROSEMARY", ev: "BYD Yuan Up 2024, Full Option 2024 September", contribution: "1M", price: "29.8M", phone: "788597303" },
  { name: "GASORE Egide", ev: "BYD Yuan Up 2024, October", contribution: "500K", price: "29.5M", phone: "785086198" },
  { name: "NIZEYIMANA ABDUL KARIM", ev: "Dongfeng E70 2023, October", contribution: "500K", price: "18.5M", phone: "785762697" },
  { name: "TUYISENGE JEAN CLAUDE 2", ev: "Dongfeng E70 2023 October", contribution: "500K", price: "18.5M", phone: "790363974" },
  { name: "NKIKABAHIZI Joseph", ev: "BYD Yuan Up 2024 Full option, September", contribution: "2M", price: "29.8M", phone: "788825856" },
  { name: "UWAMARAYIKA VENUSTE", ev: "Dongfeng E70 2023, October", contribution: "1M", price: "18.5M", phone: "788211837" },
  { name: "KABUKIRE Eric", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "784945500" },
  { name: "KABUKIRE Aime", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "788864119" },
  { name: "TUYISENGE JEAN CLAUDE", ev: "BYD Yuan Up 2025 Basic, October", contribution: "2M", price: "30.8M", phone: "786661346" },
  { name: "KASIRE Gratien", ev: "BYD Yuan Plus 2023, October", contribution: "500K", price: "28.5M", phone: "784417321" },
  { name: "NGIRINSHUTI Damascene", ev: "Dongfeng E70 2023, October", contribution: "1M", price: "18.5M", phone: "788372952" },
  { name: "NDAYISENGA Emmanuel", ev: "Wuling EV 730 - 7 Seats 2023", contribution: "2M", price: "25M", phone: "733800284" },
  { name: "RUTAYISIRE Bosco", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "785040266" },
  { name: "ITEGEKWANANDE PIERRE", ev: "BYD Yuan Up 2024, Full Option October", contribution: "1M", price: "29.5M", phone: "788610839" },
  { name: "ICYOYISHAKIYE Dieudonne", ev: "BYD E2 2023", contribution: "1M", price: "20M", phone: "788491388" },
  { name: "IRAKOZE Jean Viateur", ev: "Dongfeng E70 2023", contribution: "500K", price: "18.5M", phone: "785312245" },
  { name: "MUNYANEZA Celestin", ev: "BYD Yuan Up 2024, Full Option October", contribution: "1M", price: "29.8M", phone: "788871413" },
  { name: "TUYIRINGIRE Jean Paul", ev: "Dongfeng E70 2023", contribution: "1M", price: "18.5M", phone: "788203558" },
  { name: "SHEBA KAGABO", ev: "Dongfeng Venucia Sedan 2023", contribution: "1M", price: "20M", phone: "788897577" },
  { name: "MUVUNYI Johnson", ev: "Neta U Pro 2023", contribution: "500K", price: "23.5M", phone: "788816959" },
  { name: "NGOGA ABDOUL", ev: "BYD Yuan Up 2025 Full option, October", contribution: "2M", price: "31.5M", phone: "788633531" },
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

function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "").replace(/^250/, "").replace(/^0/, "");
}

async function main() {
  await connectDatabase();

  const candidates = await Candidate.find().select(
    "candidate_code full_name phone target_vehicle_name target_vehicle_price_rwf deposit_available_rwf",
  );
  const byPhone = new Map();
  for (const c of candidates) {
    byPhone.set(phoneDigits(c.phone), c);
  }

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const row of ROWS) {
    const key = phoneDigits(row.phone);
    const doc = byPhone.get(key);
    if (!doc) {
      console.warn(`  ✗ no candidate for ${row.name} (${row.phone})`);
      missing += 1;
      continue;
    }

    const price = parseMoney(row.price);
    const contribution = parseMoney(row.contribution);
    const patch = {
      target_vehicle_name: row.ev,
      target_vehicle_price_rwf: price ?? 0,
    };
    if (contribution != null) patch.deposit_available_rwf = contribution;

    const changed =
      doc.target_vehicle_name !== patch.target_vehicle_name ||
      Number(doc.target_vehicle_price_rwf || 0) !== Number(patch.target_vehicle_price_rwf) ||
      (contribution != null && Number(doc.deposit_available_rwf || 0) !== contribution);

    if (!changed) {
      skipped += 1;
      continue;
    }

    await Candidate.updateOne({ _id: doc._id }, { $set: patch });
    console.log(`  ✓ ${doc.candidate_code} ${doc.full_name} → ${row.ev}`);
    updated += 1;
  }

  console.log(`\nDone. updated=${updated} already_ok=${skipped} missing=${missing}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

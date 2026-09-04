/**
 * Fill target_vehicle_price_rwf when missing (0/null).
 * Prefer shortlist price by phone; else default programme price.
 * Usage: node src/scripts/fillMissingVehiclePrices.js
 */
import { connectDatabase } from "../config/database.js";
import { Candidate } from "../models/Candidate.js";
import { UZA_SELLING_PRICE_RWF } from "../services/walletPreviewService.js";

const ROWS = [
  { phone: "786943123", price: "23.5M" },
  { phone: "788660491", price: "23.5M" },
  { phone: "787613076", price: "18.5M" },
  { phone: "788611098", price: "28.5M" },
  { phone: "789752852", price: "29.8M" },
  { phone: "788592350", price: "31.5M" },
  { phone: "789526485", price: "22.8M" },
  { phone: "788506578", price: "31.5M" },
  { phone: "788359703", price: "31.5M" },
  { phone: "788852087", price: "31.5M" },
  { phone: "781720701", price: "22.8M" },
  { phone: "788741210", price: "18.5M" },
  { phone: "788235722", price: "22.8M" },
  { phone: "788226247", price: "30.8M" },
  { phone: "787056547", price: "31.5M" },
  { phone: "783670326", price: "29.2M" },
  { phone: "782722250", price: "31M" },
  { phone: "783308924", price: "31.5M" },
  { phone: "783664264", price: "30M" },
  { phone: "780759619", price: "22.8M" },
  { phone: "788445560", price: "28.5M" },
  { phone: "788781763", price: "30M" },
  { phone: "788536423", price: "31.5M" },
  { phone: "789921038", price: "31.5M" },
  { phone: "788775059", price: "30M" },
  { phone: "788252428", price: "29.5M" },
  { phone: "785201233", price: "30M" },
  { phone: "790550428", price: "18.5M" },
  { phone: "788776045", price: "23.5M" },
  { phone: "788770876", price: "29.5M" },
  { phone: "788597303", price: "29.8M" },
  { phone: "785086198", price: "29.5M" },
  { phone: "785762697", price: "18.5M" },
  { phone: "790363974", price: "18.5M" },
  { phone: "788825856", price: "29.8M" },
  { phone: "788211837", price: "18.5M" },
  { phone: "784945500", price: "31.5M" },
  { phone: "788864119", price: "31.5M" },
  { phone: "786661346", price: "30.8M" },
  { phone: "784417321", price: "28.5M" },
  { phone: "788372952", price: "18.5M" },
  { phone: "733800284", price: "25M" },
  { phone: "785040266", price: "31.5M" },
  { phone: "788610839", price: "29.5M" },
  { phone: "788491388", price: "20M" },
  { phone: "785312245", price: "18.5M" },
  { phone: "788871413", price: "29.8M" },
  { phone: "788203558", price: "18.5M" },
  { phone: "788897577", price: "20M" },
  { phone: "788816959", price: "23.5M" },
  { phone: "788633531", price: "31.5M" },
];

function parseMoney(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/,/g, "");
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

  const byPhone = new Map(ROWS.map((r) => [phoneDigits(r.phone), parseMoney(r.price)]));

  const missing = await Candidate.find({
    $or: [
      { target_vehicle_price_rwf: { $in: [0, null] } },
      { target_vehicle_price_rwf: { $exists: false } },
    ],
  }).select("candidate_code full_name phone target_vehicle_name target_vehicle_price_rwf");

  console.log(`Candidates missing price: ${missing.length}`);

  let updated = 0;
  for (const doc of missing) {
    const fromList = byPhone.get(phoneDigits(doc.phone));
    const price = fromList && fromList > 0 ? fromList : UZA_SELLING_PRICE_RWF;
    doc.target_vehicle_price_rwf = price;
    await doc.save();
    updated += 1;
    console.log(`  ✓ ${doc.candidate_code} ${doc.full_name} → ${price}`);
  }

  const sample = await Candidate.findOne({ candidate_code: "UZA-2026-00005" })
    .select("candidate_code target_vehicle_name target_vehicle_price_rwf deposit_available_rwf")
    .lean();
  console.log("sample UZA-2026-00005:", sample);
  console.log(`Done. filled=${updated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Backfill target_vehicle_name from instructor_notes "EV of Choice: …"
 * Usage: node src/scripts/backfillTargetVehicleName.js
 */
import { connectDatabase } from "../config/database.js";
import { Candidate } from "../models/Candidate.js";

async function main() {
  await connectDatabase();

  const rows = await Candidate.find({
    $or: [{ target_vehicle_name: { $exists: false } }, { target_vehicle_name: "" }, { target_vehicle_name: null }],
    instructor_notes: { $regex: /EV of Choice:/i },
  });

  let updated = 0;
  for (const doc of rows) {
    const match = String(doc.instructor_notes || "").match(/EV of Choice:\s*(.+)/i);
    if (!match?.[1]) continue;
    doc.target_vehicle_name = match[1].trim();
    await doc.save();
    updated += 1;
    console.log(`  ✓ ${doc.candidate_code} → ${doc.target_vehicle_name}`);
  }

  console.log(`Updated ${updated} candidate(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

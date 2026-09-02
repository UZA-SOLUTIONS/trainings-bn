/**
 * One-off / ops script: assign UZA-BANK-YYYY-##### to institutions missing bank_id.
 * Usage: node src/scripts/assignBankIds.js
 */
import { connectDatabase } from "../config/database.js";
import { ensureBankIds } from "../services/institutionService.js";

async function main() {
  await connectDatabase();
  const assigned = await ensureBankIds();
  console.log(assigned > 0 ? `Assigned ${assigned} bank ID(s).` : "All banks already have IDs.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

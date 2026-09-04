/**
 * Mark all candidates as screened / loan-ready (loan_review_status = pending).
 * Usage: node src/scripts/markCandidatesLoanReady.js
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Candidate } from "../models/Candidate.js";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const result = await Candidate.updateMany(
    {},
    { $set: { loan_review_status: "pending" } },
  );
  console.log(
    `Marked ${result.modifiedCount} candidate(s) loan-ready (pending). matched=${result.matchedCount}`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

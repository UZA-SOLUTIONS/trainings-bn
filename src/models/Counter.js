import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model("Counter", counterSchema);

export async function nextCandidateSequence() {
  const doc = await Counter.findByIdAndUpdate(
    "candidate_code",
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

export function formatCandidateCode(seq) {
  const year = new Date().getFullYear();
  return `UZA-${year}-${String(seq).padStart(5, "0")}`;
}

export async function nextBankSequence() {
  const doc = await Counter.findByIdAndUpdate(
    "bank_id",
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}

export function formatBankId(seq) {
  const year = new Date().getFullYear();
  return `UZA-BANK-${year}-${String(seq).padStart(5, "0")}`;
}

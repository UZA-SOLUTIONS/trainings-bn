import mongoose from "mongoose";
import { FinancingInstitution } from "../models/FinancingInstitution.js";
import { formatBankId, nextBankSequence } from "../models/Counter.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";

export async function listInstitutions({ activeOnly = true } = {}) {
  // Backfill public bank IDs for institutions created before the field existed
  await ensureBankIds();

  const filter = activeOnly ? { is_active: true } : {};
  const institutions = await FinancingInstitution.find(filter).sort({ name: 1 });
  return toJSONList(institutions);
}

export async function createInstitution(payload) {
  try {
    if (payload.is_default_for_program) {
      await FinancingInstitution.updateMany(
        { target_program: payload.target_program },
        { $set: { is_default_for_program: false } },
      );
    }
    const seq = await nextBankSequence();
    const bank_id = formatBankId(seq);
    const institution = await FinancingInstitution.create({
      ...payload,
      code: payload.code?.toUpperCase(),
      bank_id,
    });
    return toJSON(institution);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("An institution with this code already exists", 409, "DUPLICATE_CODE");
    }
    throw new AppError(err.message, 400, "INSTITUTION_CREATE_FAILED");
  }
}

export async function updateInstitution(id, payload) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Institution not found", 404, "NOT_FOUND");
  }

  // bank_id is system-assigned and immutable
  delete payload.bank_id;

  if (payload.is_default_for_program) {
    const current = await FinancingInstitution.findById(id);
    if (current) {
      await FinancingInstitution.updateMany(
        {
          target_program: payload.target_program || current.target_program,
          _id: { $ne: id },
        },
        { $set: { is_default_for_program: false } },
      );
    }
  }

  if (payload.code) payload.code = payload.code.toUpperCase();

  const institution = await FinancingInstitution.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!institution) throw new AppError("Institution not found", 404, "NOT_FOUND");
  return toJSON(institution);
}

export async function deleteInstitution(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Institution not found", 404, "NOT_FOUND");
  }
  const institution = await FinancingInstitution.findByIdAndDelete(id);
  if (!institution) throw new AppError("Institution not found", 404, "NOT_FOUND");
  return toJSON(institution);
}

/** Ensure every institution has a public bank_id (for existing seed data). */
export async function ensureBankIds() {
  const missing = await FinancingInstitution.find({
    $or: [{ bank_id: null }, { bank_id: { $exists: false } }, { bank_id: "" }],
  }).sort({ created_at: 1, name: 1 });

  let assigned = 0;
  for (const inst of missing) {
    // Avoid collisions if a previous partial assign left a hole
    let bank_id;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const seq = await nextBankSequence();
      bank_id = formatBankId(seq);
      const clash = await FinancingInstitution.exists({ bank_id });
      if (!clash) break;
    }
    inst.bank_id = bank_id;
    await inst.save();
    assigned += 1;
    console.log(`Assigned ${bank_id} → ${inst.name} (${inst.code})`);
  }
  return assigned;
}

import mongoose from "mongoose";
import { FinancingInstitution } from "../models/FinancingInstitution.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";

export async function listInstitutions({ activeOnly = true } = {}) {
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
    const institution = await FinancingInstitution.create({
      ...payload,
      code: payload.code?.toUpperCase(),
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

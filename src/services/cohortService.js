import mongoose from "mongoose";
import { Cohort } from "../models/Cohort.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";

export async function listCohorts({ openOnly = false } = {}) {
  const filter = openOnly ? { applications_open: true } : {};
  const cohorts = await Cohort.find(filter).sort({ start_date: 1 });
  return toJSONList(cohorts);
}

export async function getCohortById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  const cohort = await Cohort.findById(id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  return toJSON(cohort);
}

export async function createCohort(payload) {
  try {
    const cohort = await Cohort.create(payload);
    return toJSON(cohort);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("A cohort with this code already exists", 409, "DUPLICATE_CODE");
    }
    throw new AppError(err.message, 400, "COHORT_CREATE_FAILED");
  }
}

export async function updateCohort(id, payload) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  const cohort = await Cohort.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  return toJSON(cohort);
}

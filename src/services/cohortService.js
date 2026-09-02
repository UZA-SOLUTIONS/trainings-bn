import mongoose from "mongoose";
import { Cohort } from "../models/Cohort.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";
import { assertCohortAccess, cohortIdsForUser } from "../utils/permissions.js";

async function buildCohortFilter(user, { openOnly = false } = {}) {
  const filter = openOnly ? { applications_open: true } : {};

  const scopedCohortIds = await cohortIdsForUser(user);
  if (scopedCohortIds !== null) {
    filter._id = { $in: scopedCohortIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  return filter;
}

export async function listCohorts(user, { openOnly = false } = {}) {
  const filter = await buildCohortFilter(user, { openOnly });
  const cohorts = await Cohort.find(filter).sort({ start_date: 1 });
  return toJSONList(cohorts).map((c) => ({
    ...c,
    institution_id: c.institution_id ? String(c.institution_id) : null,
  }));
}

export async function getCohortById(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }

  await assertCohortAccess(user, id);

  const cohort = await Cohort.findById(id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  const json = toJSON(cohort);
  json.institution_id = json.institution_id ? String(json.institution_id) : null;
  return json;
}

export async function createCohort(payload) {
  try {
    const cohort = await Cohort.create(payload);
    const json = toJSON(cohort);
    json.institution_id = json.institution_id ? String(json.institution_id) : null;
    return json;
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
  const json = toJSON(cohort);
  json.institution_id = json.institution_id ? String(json.institution_id) : null;
  return json;
}

export async function deleteCohort(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }

  const { Candidate } = await import("../models/Candidate.js");
  const candidateCount = await Candidate.countDocuments({ cohort_id: id });
  if (candidateCount > 0) {
    throw new AppError(
      `Cannot delete cohort with ${candidateCount} candidate(s). Move or remove them first.`,
      409,
      "COHORT_HAS_CANDIDATES",
    );
  }

  const cohort = await Cohort.findByIdAndDelete(id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  const json = toJSON(cohort);
  json.institution_id = json.institution_id ? String(json.institution_id) : null;
  return json;
}

import mongoose from "mongoose";
import { Cohort } from "../models/Cohort.js";
import { Course } from "../models/Course.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";
import { assertCohortAccess, cohortIdsForUser } from "../utils/permissions.js";

const POPULATE = [{ path: "course_id", select: "name code status" }];

export function serializeCohort(doc) {
  if (!doc) return null;
  const json = toJSON(doc);
  const course =
    json.course_id && typeof json.course_id === "object" && json.course_id.name
      ? {
          id: String(json.course_id.id ?? json.course_id._id),
          name: json.course_id.name,
          code: json.course_id.code,
          status: json.course_id.status,
        }
      : null;

  json.course_id = course?.id ?? (json.course_id ? String(json.course_id) : null);
  json.course = course;
  json.institution_id = json.institution_id ? String(json.institution_id) : null;
  json.kind = json.kind === "institution" ? "institution" : "uza";
  json.target_school_code = json.target_school_code || null;
  return json;
}

async function buildCohortFilter(user, { openOnly = false } = {}) {
  const filter = openOnly ? { applications_open: true, kind: { $ne: "institution" } } : {};

  const scopedCohortIds = await cohortIdsForUser(user);
  if (scopedCohortIds !== null) {
    filter._id = { $in: scopedCohortIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  return filter;
}

async function normalizePayload(payload) {
  const next = { ...payload };
  if (next.course_id === "" || next.course_id === "none") next.course_id = null;
  if (next.target_school_code === "") next.target_school_code = null;
  if (typeof next.target_school_code === "string") {
    next.target_school_code = next.target_school_code.trim().toLowerCase() || null;
  }

  if (next.kind === "institution") {
    next.applications_open = false;
    next.partner_bank = null;
    next.institution_id = null;
  } else if (next.kind === "uza") {
    next.target_school_code = null;
  }

  if (next.course_id) {
    if (!mongoose.isValidObjectId(next.course_id)) {
      throw new AppError("Course not found", 404, "NOT_FOUND");
    }
    const course = await Course.findById(next.course_id).select("_id");
    if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");
  }

  return next;
}

export async function listCohorts(user, { openOnly = false } = {}) {
  const filter = await buildCohortFilter(user, { openOnly });
  const cohorts = await Cohort.find(filter).populate(POPULATE).sort({ start_date: 1 });
  return cohorts.map(serializeCohort);
}

export async function getCohortById(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }

  await assertCohortAccess(user, id);

  const cohort = await Cohort.findById(id).populate(POPULATE);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  return serializeCohort(cohort);
}

export async function createCohort(payload) {
  try {
    const data = await normalizePayload(payload);
    const cohort = await Cohort.create(data);
    await cohort.populate(POPULATE);
    return serializeCohort(cohort);
  } catch (err) {
    if (err instanceof AppError) throw err;
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
  const data = await normalizePayload(payload);
  const cohort = await Cohort.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate(POPULATE);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  return serializeCohort(cohort);
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
  return serializeCohort(cohort);
}

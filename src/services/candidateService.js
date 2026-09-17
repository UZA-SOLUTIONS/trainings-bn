import mongoose from "mongoose";
import { Candidate } from "../models/Candidate.js";
import { Cohort } from "../models/Cohort.js";
import { formatCandidateCode, nextCandidateSequence } from "../models/Counter.js";
import { buildCandidateTrackView } from "./candidateTrackService.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";
import {
  assertCandidateAccess,
  assertCohortAccess,
  cohortIdsForUser,
  filterCandidatePatch,
} from "../utils/permissions.js";
import { serializeCohort } from "./cohortService.js";

async function assignSeat(cohort) {
  const taken = await Candidate.countDocuments({
    cohort_id: cohort._id,
    status: { $in: ["enrolled", "graduated"] },
  });

  if (taken < cohort.capacity) {
    return { status: "enrolled", waitlist_position: null };
  }

  const last = await Candidate.findOne({
    cohort_id: cohort._id,
    status: "waitlisted",
  })
    .sort({ waitlist_position: -1 })
    .select("waitlist_position")
    .lean();

  return {
    status: "waitlisted",
    waitlist_position: (last?.waitlist_position ?? 0) + 1,
  };
}

async function promoteWaitlist(cohortId) {
  const cohort = await Cohort.findById(cohortId);
  if (!cohort) return;

  let taken = await Candidate.countDocuments({
    cohort_id: cohortId,
    status: { $in: ["enrolled", "graduated"] },
  });

  while (taken < cohort.capacity) {
    const next = await Candidate.findOne({
      cohort_id: cohortId,
      status: "waitlisted",
    }).sort({ waitlist_position: 1, applied_at: 1 });

    if (!next) break;

    next.status = "enrolled";
    next.waitlist_position = null;
    await next.save();
    taken += 1;
  }
}

async function buildListFilter(user, { cohortId } = {}) {
  const filter = {};

  if (cohortId) {
    if (!mongoose.isValidObjectId(cohortId)) return { impossible: true };
    filter.cohort_id = cohortId;
  }

  const scopedCohortIds = await cohortIdsForUser(user);
  if (scopedCohortIds !== null) {
    if (cohortId && !scopedCohortIds.includes(String(cohortId))) {
      return { impossible: true };
    }
    if (!cohortId) {
      filter.cohort_id = { $in: scopedCohortIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }
  }

  return filter;
}

export async function createCandidate(payload) {
  if (!mongoose.isValidObjectId(payload.cohort_id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }

  const cohort = await Cohort.findById(payload.cohort_id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  if (!cohort.applications_open) {
    throw new AppError("This cohort is not accepting applications", 400, "COHORT_CLOSED");
  }

  const seat = await assignSeat(cohort);
  const seq = await nextCandidateSequence();
  const candidate_code = formatCandidateCode(seq);

  try {
    const candidate = await Candidate.create({
      ...payload,
      cohort_id: cohort._id,
      candidate_code,
      email: payload.email || null,
      license_issue_date: payload.license_issue_date || null,
      status: seat.status,
      waitlist_position: seat.waitlist_position,
      applied_at: new Date(),
    });

    return {
      id: String(candidate._id),
      candidate_code: candidate.candidate_code,
      status: candidate.status,
      waitlist_position: candidate.waitlist_position,
    };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("You have already applied to this cohort.", 409, "DUPLICATE_APPLICATION");
    }
    throw new AppError(err.message, 400, "APPLICATION_FAILED");
  }
}

export async function createIntakeRosterCandidate(user, payload) {
  if (!mongoose.isValidObjectId(payload.cohort_id)) {
    throw new AppError("Cohort not found", 404, "NOT_FOUND");
  }
  await assertCohortAccess(user, payload.cohort_id);
  const cohort = await Cohort.findById(payload.cohort_id);
  if (!cohort) throw new AppError("Cohort not found", 404, "NOT_FOUND");
  if (cohort.kind !== "institution") {
    throw new AppError(
      "Identity-only roster add is only for partner institution intakes",
      400,
      "NOT_INSTITUTION_INTAKE",
    );
  }

  const seat = await assignSeat(cohort);
  const seq = await nextCandidateSequence();
  const candidate_code = formatCandidateCode(seq);

  try {
    const candidate = await Candidate.create({
      cohort_id: cohort._id,
      candidate_code,
      full_name: payload.full_name,
      national_id: payload.national_id,
      phone: payload.phone,
      gender: payload.gender ?? null,
      district: payload.district ?? null,
      date_of_birth: payload.date_of_birth ?? null,
      email: payload.email || null,
      status: payload.status ?? seat.status,
      waitlist_position: payload.status === "enrolled" ? null : seat.waitlist_position,
      training_status: "not_started",
      driving_license_number: "N/A",
      years_driving_experience: 0,
      monthly_income_rwf: 0,
      average_daily_earnings_rwf: 0,
      deposit_available_rwf: 0,
      preferred_term_years: 1,
      marital_status: "unspecified",
      applied_at: new Date(),
    });

    const json = toJSON(candidate);
    json.cohort_id = String(json.cohort_id);
    return json;
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("This national ID is already in this intake.", 409, "DUPLICATE_APPLICATION");
    }
    throw new AppError(err.message, 400, "CANDIDATE_CREATE_FAILED");
  }
}

export async function bulkCreateIntakeRoster(user, { cohort_id, candidates }) {
  const created = [];
  const errors = [];
  for (let index = 0; index < candidates.length; index += 1) {
    try {
      const candidate = await createIntakeRosterCandidate(user, { ...candidates[index], cohort_id });
      created.push(candidate);
    } catch (err) {
      errors.push({
        index,
        national_id: candidates[index].national_id,
        message: err.message || "Could not add candidate",
      });
    }
  }
  return { created, errors };
}

export async function listCandidates(user, { cohortId } = {}) {
  const filter = await buildListFilter(user, { cohortId });
  if (filter.impossible) return [];

  const candidates = await Candidate.find(filter).sort({
    waitlist_position: 1,
    applied_at: 1,
  });

  return toJSONList(candidates).map((c) => ({
    ...c,
    cohort_id: String(c.cohort_id),
  }));
}

export async function updateCandidate(user, id, patch) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }

  const existing = await Candidate.findById(id);
  if (!existing) throw new AppError("Candidate not found", 404, "NOT_FOUND");

  await assertCandidateAccess(user, existing);

  const filteredPatch = filterCandidatePatch(user, patch);
  const previousStatus = existing.status;
  Object.assign(existing, filteredPatch);
  await existing.save();

  if (
    ["enrolled", "graduated"].includes(previousStatus) &&
    ["rejected", "withdrawn"].includes(existing.status)
  ) {
    await promoteWaitlist(existing.cohort_id);
  }

  const json = toJSON(existing);
  json.cohort_id = String(json.cohort_id);
  return json;
}

export async function deleteCandidate(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }

  const existing = await Candidate.findById(id);
  if (!existing) throw new AppError("Candidate not found", 404, "NOT_FOUND");

  await assertCandidateAccess(user, existing);

  const previousStatus = existing.status;
  const cohortId = existing.cohort_id;
  await existing.deleteOne();

  if (["enrolled", "graduated"].includes(previousStatus)) {
    await promoteWaitlist(cohortId);
  }

  return { id: String(id) };
}

export async function listCandidatesSummary(user) {
  const filter = await buildListFilter(user, {});
  if (filter.impossible) return [];

  const candidates = await Candidate.find(filter)
    .select("cohort_id status training_status loan_review_status listed_on_crb")
    .lean();

  return candidates.map((c) => ({
    id: String(c._id),
    cohort_id: String(c.cohort_id),
    status: c.status,
    training_status: c.training_status,
    loan_review_status: c.loan_review_status,
    listed_on_crb: c.listed_on_crb,
  }));
}

export async function getCandidateForStaff(user, id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }
  const candidate = await Candidate.findById(id);
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  await assertCandidateAccess(user, candidate);

  const json = toJSON(candidate);
  json.cohort_id = json.cohort_id ? String(json.cohort_id) : null;

  const cohortDoc = await Cohort.findById(candidate.cohort_id).populate({
    path: "course_id",
    select: "name code status",
  });
  return { candidate: json, cohort: serializeCohort(cohortDoc) };
}

const CANDIDATE_CODE_RE = /^UZA-\d{4}-\d{5}$/;
const BANK_ID_RE = /^UZA-BANK-\d{4}-\d{5}$/;

/**
 * Public track lookup.
 * - Bank IDs return the portfolio immediately.
 * - Personal candidate IDs return the track view (login preferred for account access).
 */
export async function trackByCode(rawCode) {
  const code = String(rawCode || "")
    .trim()
    .toUpperCase();

  if (BANK_ID_RE.test(code)) {
    const { getInstitutionByBankId, buildBankTrackView } = await import("./bankTrackService.js");
    const institution = await getInstitutionByBankId(code);
    const bank = await buildBankTrackView(institution);
    return { type: "bank", bank };
  }

  if (!CANDIDATE_CODE_RE.test(code)) {
    throw new AppError(
      "Enter a valid candidate ID (UZA-2026-00001) or bank ID (UZA-BANK-2026-00001).",
      400,
      "INVALID_CODE",
    );
  }

  const candidate = await Candidate.findOne({ candidate_code: code }).lean();
  if (!candidate) {
    throw new AppError("No application found for that candidate ID.", 404, "NOT_FOUND");
  }

  const cohort = await Cohort.findById(candidate.cohort_id).lean();
  const track = await buildCandidateTrackView(candidate, cohort);
  return { type: "candidate", track };
}

/** @deprecated Prefer trackByCode */
export async function trackCandidateByCode(rawCode) {
  const result = await trackByCode(rawCode);
  if (result.type !== "candidate") {
    throw new AppError(
      "Enter a valid candidate ID (example: UZA-2026-00001).",
      400,
      "INVALID_CODE",
    );
  }
  return result.track;
}

export async function loginCandidateByCode(rawCode) {
  const code = String(rawCode || "")
    .trim()
    .toUpperCase();

  if (!CANDIDATE_CODE_RE.test(code)) {
    throw new AppError(
      "Enter a valid candidate ID (example: UZA-2026-00001).",
      400,
      "INVALID_CODE",
    );
  }

  const candidate = await Candidate.findOne({ candidate_code: code }).lean();
  if (!candidate) {
    throw new AppError("No application found for that candidate ID.", 404, "NOT_FOUND");
  }

  const { signAccessToken } = await import("../utils/jwt.js");
  const token = signAccessToken({
    sub: String(candidate._id),
    role: "candidate",
    candidate_code: candidate.candidate_code,
  });

  return {
    token,
    user: {
      id: String(candidate._id),
      role: "candidate",
      candidate_code: candidate.candidate_code,
      full_name: candidate.full_name,
    },
  };
}

export async function getCandidateAccount(candidateId) {
  const candidate = await Candidate.findById(candidateId).lean();
  if (!candidate) {
    throw new AppError("Candidate account not found.", 404, "NOT_FOUND");
  }
  const cohort = await Cohort.findById(candidate.cohort_id).lean();
  const track = await buildCandidateTrackView(candidate, cohort);
  return {
    user: {
      id: String(candidate._id),
      role: "candidate",
      candidate_code: candidate.candidate_code,
      full_name: candidate.full_name,
    },
    track,
  };
}

import mongoose from "mongoose";
import { Candidate } from "../models/Candidate.js";
import { Cohort } from "../models/Cohort.js";
import { formatCandidateCode, nextCandidateSequence } from "../models/Counter.js";
import { buildCandidateTrackView } from "./candidateTrackService.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";
import {
  assertCandidateAccess,
  cohortIdsForUser,
  filterCandidatePatch,
} from "../utils/permissions.js";

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

const CANDIDATE_CODE_RE = /^UZA-\d{4}-\d{5}$/;

export async function trackCandidateByCode(rawCode) {
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

  const cohort = await Cohort.findById(candidate.cohort_id).lean();
  return buildCandidateTrackView(candidate, cohort);
}

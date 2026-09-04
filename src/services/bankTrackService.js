import { Candidate } from "../models/Candidate.js";
import { Cohort } from "../models/Cohort.js";
import { FinancingInstitution } from "../models/FinancingInstitution.js";
import { AppError } from "../utils/errors.js";
import { TRACK_DOCUMENTS } from "./candidateTrackService.js";

function docsSummary(candidate) {
  const applicable = TRACK_DOCUMENTS.filter((doc) => {
    if (doc.conditional === "married") {
      return String(candidate.marital_status || "").toLowerCase().includes("married");
    }
    if (doc.conditional === "cooperative") return Boolean(candidate.is_cooperative_member);
    if (doc.conditional === "previous_service") return Boolean(candidate.previously_drove_for_service);
    return true;
  });
  const required = applicable.filter((d) => d.conditional !== "optional_later");
  const complete = required.filter((d) => Boolean(candidate[d.key])).length;
  return {
    complete,
    required: required.length,
    percent: required.length ? Math.round((complete / required.length) * 100) : 0,
  };
}

/**
 * Public bank portfolio for Track ID lookups (UZA-BANK-YYYY-#####).
 * Lists candidates in cohorts linked to this financing institution.
 */
export async function buildBankTrackView(institution) {
  const cohorts = await Cohort.find({
    $or: [
      { institution_id: institution._id },
      { partner_bank: new RegExp(`^${escapeRegex(institution.name)}$`, "i") },
    ],
  })
    .select("_id name code location start_date partner_bank institution_id")
    .lean();

  const cohortIds = cohorts.map((c) => c._id);
  const cohortById = new Map(cohorts.map((c) => [String(c._id), c]));

  const candidates = cohortIds.length
    ? await Candidate.find({ cohort_id: { $in: cohortIds } })
        .sort({ applied_at: 1 })
        .lean()
    : [];

  const trainingCompleted = candidates.filter((c) => c.training_status === "completed").length;
  const trainingInProgress = candidates.filter((c) => c.training_status === "in_progress").length;
  const trainingNotStarted = candidates.filter((c) => c.training_status === "not_started").length;
  const trainingFailed = candidates.filter((c) => c.training_status === "failed").length;
  const enrolled = candidates.filter((c) => c.status === "enrolled" || c.status === "graduated").length;
  const waitlisted = candidates.filter((c) => c.status === "waitlisted").length;

  const rows = candidates.map((c) => {
    const summary = docsSummary(c);
    const cohort = cohortById.get(String(c.cohort_id));
    return {
      candidate_code: c.candidate_code,
      full_name: c.full_name,
      phone: c.phone,
      status: c.status,
      waitlist_position: c.waitlist_position,
      training_status: c.training_status,
      attendance_percentage: c.attendance_percentage ?? null,
      exam_score: c.exam_score ?? null,
      loan_review_status: c.loan_review_status,
      listed_on_crb: Boolean(c.listed_on_crb),
      needs_uza_access_support: Boolean(c.needs_uza_access_support),
      deposit_available_rwf: c.deposit_available_rwf ?? null,
      target_vehicle_name: c.target_vehicle_name || null,
      target_vehicle_price_rwf: c.target_vehicle_price_rwf ?? null,
      preferred_financing: c.preferred_financing ?? null,
      documents_percent: summary.percent,
      documents_complete: summary.complete,
      documents_required: summary.required,
      applied_at: c.applied_at,
      cohort: cohort
        ? {
            id: String(cohort._id),
            name: cohort.name,
            code: cohort.code,
            location: cohort.location,
            start_date: cohort.start_date,
          }
        : null,
    };
  });

  return {
    bank_id: institution.bank_id,
    name: institution.name,
    code: institution.code,
    is_active: institution.is_active,
    cohorts: cohorts.map((c) => ({
      id: String(c._id),
      name: c.name,
      code: c.code,
      location: c.location,
      start_date: c.start_date,
      candidate_count: rows.filter((r) => r.cohort?.id === String(c._id)).length,
    })),
    summary: {
      total_candidates: candidates.length,
      enrolled,
      waitlisted,
      training_completed: trainingCompleted,
      training_in_progress: trainingInProgress,
      training_not_started: trainingNotStarted,
      training_failed: trainingFailed,
      docs_ready: rows.filter((r) => r.documents_percent >= 100).length,
    },
    candidates: rows,
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getInstitutionByBankId(rawCode) {
  const code = String(rawCode || "")
    .trim()
    .toUpperCase();
  const institution = await FinancingInstitution.findOne({ bank_id: code }).lean();
  if (!institution) {
    throw new AppError("No bank found for that bank ID.", 404, "NOT_FOUND");
  }
  return institution;
}

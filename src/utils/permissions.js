import { Cohort } from "../models/Cohort.js";
import { AppError } from "./errors.js";

export const ROLES = ["admin", "instructor", "bank_partner"];

export const DOC_FIELDS = [
  "doc_national_id",
  "doc_spouse_id",
  "doc_loan_application_letter",
  "doc_tax_clearance",
  "doc_marital_status_proof",
  "doc_proforma_invoice",
  "doc_deposit_proof",
  "doc_momo_statement",
  "doc_yego_history",
  "doc_cooperative_letter",
  "doc_driving_license",
  "doc_previous_vehicle_docs",
  "doc_two_passport_photos",
  "doc_passport_photo",
  "doc_criminal_record",
  "doc_proof_of_residence",
  "doc_bank_statement",
  "doc_medical_certificate",
];

export const MEMBERSHIP_FIELDS = ["status"];
export const TRAINING_FIELDS = [
  "training_status",
  "attendance_percentage",
  "exam_score",
  "instructor_notes",
  "disqualification_reason",
];
export const BANK_FIELDS = [
  ...DOC_FIELDS,
  "crb_resolution_notes",
  "loan_review_status",
  "bank_notes",
];

export function isAdmin(user) {
  return user?.role === "admin";
}

export function isInstructor(user) {
  return user?.role === "instructor";
}

export function isBankPartner(user) {
  return user?.role === "bank_partner";
}

export function canAccessTab(user, tab) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isInstructor(user)) {
    return ["overview", "cohorts", "candidates", "courses", "modules", "banks", "settings"].includes(
      tab,
    );
  }
  if (isBankPartner(user)) {
    return ["overview", "cohorts", "candidates", "settings"].includes(tab);
  }
  return false;
}

export function filterCandidatePatch(user, patch) {
  if (isAdmin(user)) return { ...patch };

  const allowed = isInstructor(user)
    ? [...MEMBERSHIP_FIELDS, ...TRAINING_FIELDS]
    : isBankPartner(user)
      ? BANK_FIELDS
      : [];

  const filtered = {};
  for (const key of Object.keys(patch)) {
    if (allowed.includes(key)) {
      filtered[key] = patch[key];
    }
  }

  if (isInstructor(user) && filtered.status === "rejected" && !filtered.disqualification_reason?.trim()) {
    throw new AppError(
      "A disqualification reason is required when rejecting a candidate",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (Object.keys(filtered).length === 0) {
    throw new AppError("You cannot update these fields", 403, "FORBIDDEN");
  }

  return filtered;
}

export async function cohortIdsForUser(user) {
  if (!user || isAdmin(user) || isInstructor(user)) return null;

  if (isBankPartner(user)) {
    if (!user.institution_id) {
      throw new AppError("Bank partner account is missing institution assignment", 403, "FORBIDDEN");
    }
    const cohorts = await Cohort.find({ institution_id: user.institution_id }).select("_id").lean();
    return cohorts.map((c) => String(c._id));
  }

  return [];
}

export async function assertCohortAccess(user, cohortId) {
  if (!user || isAdmin(user) || isInstructor(user)) return;

  const allowed = await cohortIdsForUser(user);
  if (!allowed?.includes(String(cohortId))) {
    throw new AppError("You do not have access to this cohort", 403, "FORBIDDEN");
  }
}

export async function assertCandidateAccess(user, candidate) {
  if (!user || isAdmin(user) || isInstructor(user)) return;
  await assertCohortAccess(user, candidate.cohort_id);
}

export function tokenPayloadForUser(user) {
  const payload = {
    sub: String(user._id ?? user.id),
    email: user.email,
    role: user.role,
  };
  if (user.institution_id) {
    payload.institution_id = String(user.institution_id);
  }
  return payload;
}

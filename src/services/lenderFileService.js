import mongoose from "mongoose";
import { Candidate } from "../models/Candidate.js";
import { Cohort } from "../models/Cohort.js";
import { BorrowerLenderConsent } from "../models/BorrowerLenderConsent.js";
import { LenderReadAudit } from "../models/LenderReadAudit.js";
import { FinancingInstitution } from "../models/FinancingInstitution.js";
import { AppError } from "../utils/errors.js";
import { filterCandidatePatch, isAdmin, isBankPartner } from "../utils/permissions.js";
import { buildWalletPreview } from "./walletPreviewService.js";

export const LENDER_REFUSAL_MESSAGE = "No file available for that reference.";

const CANDIDATE_CODE_RE = /^UZA-\d{4}-\d{5}$/;

function normalizeCode(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase();
}

function displayName(fullName) {
  const parts = String(fullName || "Borrower").trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "Borrower";
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

async function logReadAttempt(user, candidateCode, outcome, internalReason) {
  if (!user?.institution_id) return;
  await LenderReadAudit.create({
    actor_id: user.id,
    actor_email: user.email,
    institution_id: user.institution_id,
    candidate_code: candidateCode,
    outcome,
    internal_reason: internalReason,
  });
}

async function denyFile(user, candidateCode, internalReason) {
  await logReadAttempt(user, candidateCode, "denied", internalReason);
  throw new AppError(LENDER_REFUSAL_MESSAGE, 404, "NOT_FOUND");
}

function buildTrainingSection(candidate, cohort) {
  if (!candidate || candidate.training_status === "not_started") {
    return undefined;
  }

  const assessmentPassed =
    candidate.training_status === "completed" &&
    (candidate.exam_score == null || candidate.exam_score >= 50);

  return {
    programme: cohort?.name ?? "Tunga Taxi",
    completedDate:
      candidate.training_status === "completed" && candidate.updated_at
        ? new Date(candidate.updated_at).toISOString().slice(0, 10)
        : null,
    assessmentPassed,
  };
}

function buildCreditEnhancementSection(institution, candidate) {
  if (!institution?.supports_uza_access_topup) return undefined;
  if (!candidate?.needs_uza_access_support) return undefined;

  return {
    pledged: true,
    released: false,
    callable: candidate.loan_review_status !== "approved",
  };
}

function buildLenderFile(candidate, cohort, institution) {
  const file = {
    identity: {
      uzaId: candidate.candidate_code,
      displayName: displayName(candidate.full_name),
    },
    loanReview: {
      status: candidate.loan_review_status ?? "not_ready",
      notes: candidate.bank_notes ?? null,
    },
  };

  const training = buildTrainingSection(candidate, cohort);
  if (training) file.training = training;

  const creditEnhancement = buildCreditEnhancementSection(institution, candidate);
  if (creditEnhancement) file.creditEnhancement = creditEnhancement;

  file.wallet = buildWalletPreview(candidate, { audience: "bank" });

  return file;
}

async function resolveConsentContext(user, rawCode) {
  if (!isBankPartner(user) && !isAdmin(user)) {
    throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const code = normalizeCode(rawCode);
  if (!CANDIDATE_CODE_RE.test(code)) {
    await denyFile(user, code || null, "invalid_code_format");
  }

  const candidate = await Candidate.findOne({ candidate_code: code }).lean();
  if (!candidate) {
    await denyFile(user, code, "candidate_not_found");
  }

  const cohort = await Cohort.findById(candidate.cohort_id).lean();
  if (!cohort) {
    await denyFile(user, code, "cohort_not_found");
  }

  let institutionId = user.institution_id;
  if (isAdmin(user)) {
    institutionId = cohort.institution_id ? String(cohort.institution_id) : null;
    if (!institutionId) {
      await denyFile(user, code, "cohort_has_no_institution");
    }
  }

  if (!institutionId) {
    await denyFile(user, code, "bank_user_missing_institution");
  }

  if (String(cohort.institution_id) !== String(institutionId)) {
    await denyFile(user, code, "wrong_institution");
  }

  const consent = await BorrowerLenderConsent.findOne({
    candidate_id: candidate._id,
    institution_id: institutionId,
  }).lean();

  if (!consent) {
    await denyFile(user, code, "no_consent");
  }

  if (consent.withdrawn_at) {
    await denyFile(user, code, "consent_withdrawn");
  }

  const institution = await FinancingInstitution.findById(institutionId).lean();

  return { code, candidate, cohort, institution, institutionId };
}

export async function listLenderFiles(user) {
  if (!isBankPartner(user) && !isAdmin(user)) {
    throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const institutionId = user.institution_id;
  if (isBankPartner(user) && !institutionId) {
    throw new AppError("Bank partner account is missing institution assignment", 403, "FORBIDDEN");
  }

  const filter = { withdrawn_at: null };
  if (isBankPartner(user)) {
    filter.institution_id = institutionId;
  }

  const consents = await BorrowerLenderConsent.find(filter).lean();
  if (consents.length === 0) return [];

  const candidateIds = consents.map((c) => c.candidate_id);
  const candidates = await Candidate.find({ _id: { $in: candidateIds } })
    .select("candidate_code full_name loan_review_status training_status cohort_id")
    .lean();

  const cohortIds = [...new Set(candidates.map((c) => String(c.cohort_id)))];
  const cohorts = await Cohort.find({ _id: { $in: cohortIds } }).select("institution_id").lean();
  const cohortMap = new Map(cohorts.map((c) => [String(c._id), c]));

  const consentByCandidate = new Map(consents.map((c) => [String(c.candidate_id), c]));

  const files = [];
  for (const candidate of candidates) {
    const consent = consentByCandidate.get(String(candidate._id));
    if (!consent) continue;

    const cohort = cohortMap.get(String(candidate.cohort_id));
    if (isBankPartner(user) && String(cohort?.institution_id) !== String(institutionId)) {
      continue;
    }

    files.push({
      uzaId: candidate.candidate_code,
      displayName: displayName(candidate.full_name),
      loanReviewStatus: candidate.loan_review_status ?? "not_ready",
      trainingStatus: candidate.training_status,
    });
  }

  files.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return files;
}

export async function getLenderFile(user, rawCode) {
  const { code, candidate, cohort, institution } = await resolveConsentContext(user, rawCode);
  await logReadAttempt(user, code, "allowed", "file_served");
  return buildLenderFile(candidate, cohort, institution);
}

export async function updateLenderFile(user, rawCode, patch) {
  const { code, candidate } = await resolveConsentContext(user, rawCode);

  const filtered = filterCandidatePatch(user, patch);
  const allowedKeys = ["loan_review_status", "bank_notes"];
  const safePatch = {};
  for (const key of allowedKeys) {
    if (key in filtered) safePatch[key] = filtered[key];
  }

  if (Object.keys(safePatch).length === 0) {
    throw new AppError("You cannot update these fields", 403, "FORBIDDEN");
  }

  const doc = await Candidate.findById(candidate._id);
  if (!doc) {
    await denyFile(user, code, "candidate_not_found_on_update");
  }

  Object.assign(doc, safePatch);
  await doc.save();

  await logReadAttempt(user, code, "allowed", "file_updated");

  const cohort = await Cohort.findById(doc.cohort_id).lean();
  const institution = await FinancingInstitution.findById(user.institution_id ?? cohort?.institution_id).lean();
  return buildLenderFile(doc.toObject(), cohort, institution);
}

/** Seeds active consent for candidates in cohorts linked to an institution. */
export async function seedConsentsForInstitution(institutionId) {
  if (!institutionId) return 0;

  const cohorts = await Cohort.find({ institution_id: institutionId }).select("_id").lean();
  if (cohorts.length === 0) return 0;

  const cohortIds = cohorts.map((c) => c._id);
  const candidates = await Candidate.find({ cohort_id: { $in: cohortIds } })
    .select("candidate_code cohort_id")
    .lean();

  let created = 0;
  for (const candidate of candidates) {
    const existing = await BorrowerLenderConsent.findOne({
      candidate_id: candidate._id,
      institution_id: institutionId,
    }).lean();
    if (existing) continue;

    await BorrowerLenderConsent.create({
      candidate_id: candidate._id,
      candidate_code: candidate.candidate_code,
      institution_id: institutionId,
      granted_at: new Date(),
      withdrawn_at: null,
    });
    created += 1;
  }

  return created;
}

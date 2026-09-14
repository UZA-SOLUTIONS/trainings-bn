import mongoose from "mongoose";
import { CandidateIssue } from "../models/CandidateIssue.js";
import { Candidate } from "../models/Candidate.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";
import { assertCohortAccess } from "../utils/permissions.js";
import { getCohortById } from "./cohortService.js";

function serializeIssue(doc) {
  const json = toJSON(doc);
  json.candidate_id = json.candidate_id ? String(json.candidate_id) : null;
  json.cohort_id = json.cohort_id ? String(json.cohort_id) : null;
  json.reported_by = json.reported_by ? String(json.reported_by) : null;
  return json;
}

async function withCandidateNames(issues) {
  const ids = [...new Set(issues.map((i) => String(i.candidate_id)))];
  if (ids.length === 0) return issues.map(serializeIssue);

  const candidates = await Candidate.find({ _id: { $in: ids } }).select(
    "full_name candidate_code",
  );
  const byId = new Map(candidates.map((c) => [String(c._id), c]));

  return issues.map((issue) => {
    const json = serializeIssue(issue);
    const candidate = byId.get(json.candidate_id);
    json.candidate_name = candidate?.full_name ?? null;
    json.candidate_code = candidate?.candidate_code ?? null;
    return json;
  });
}

async function loadIssue(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Issue not found", 404, "NOT_FOUND");
  }
  const issue = await CandidateIssue.findById(id);
  if (!issue) throw new AppError("Issue not found", 404, "NOT_FOUND");
  return issue;
}

export async function listCohortIssues(user, cohortId, { status, candidate_id } = {}) {
  await getCohortById(user, cohortId);
  const filter = { cohort_id: cohortId };
  if (status) filter.status = status;
  if (candidate_id) filter.candidate_id = candidate_id;
  const issues = await CandidateIssue.find(filter).sort({ created_at: -1 });
  return withCandidateNames(issues);
}

export async function listCandidateIssues(user, candidateId) {
  if (!mongoose.isValidObjectId(candidateId)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  await assertCohortAccess(user, candidate.cohort_id);

  const issues = await CandidateIssue.find({ candidate_id: candidateId }).sort({ created_at: -1 });
  return withCandidateNames(issues);
}

export async function createCohortIssue(user, cohortId, payload) {
  await getCohortById(user, cohortId);

  const candidate = await Candidate.findById(payload.candidate_id);
  if (!candidate || String(candidate.cohort_id) !== String(cohortId)) {
    throw new AppError("Candidate is not in this cohort", 400, "VALIDATION_ERROR");
  }

  const issue = await CandidateIssue.create({
    candidate_id: payload.candidate_id,
    cohort_id: cohortId,
    reported_by: user.id,
    category: payload.category,
    severity: payload.severity ?? "medium",
    title: payload.title,
    description: payload.description ?? null,
    status: "open",
  });

  const [serialized] = await withCandidateNames([issue]);
  return serialized;
}

export async function createCandidateIssue(user, candidateId, payload) {
  if (!mongoose.isValidObjectId(candidateId)) {
    throw new AppError("Candidate not found", 404, "NOT_FOUND");
  }
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  await assertCohortAccess(user, candidate.cohort_id);

  return createCohortIssue(user, String(candidate.cohort_id), {
    ...payload,
    candidate_id: candidateId,
  });
}

export async function updateIssue(user, issueId, payload) {
  const issue = await loadIssue(issueId);
  await assertCohortAccess(user, issue.cohort_id);

  if (payload.category !== undefined) issue.category = payload.category;
  if (payload.severity !== undefined) issue.severity = payload.severity;
  if (payload.title !== undefined) issue.title = payload.title;
  if (payload.description !== undefined) issue.description = payload.description;
  if (payload.resolution_notes !== undefined) issue.resolution_notes = payload.resolution_notes;

  if (payload.status !== undefined) {
    issue.status = payload.status;
    if (payload.status === "resolved") {
      issue.resolved_at = issue.resolved_at ?? new Date();
    } else {
      issue.resolved_at = null;
    }
  }

  await issue.save();
  const [serialized] = await withCandidateNames([issue]);
  return serialized;
}

import mongoose from "mongoose";
import { Assessment } from "../models/Assessment.js";
import { AssessmentScore } from "../models/AssessmentScore.js";
import { Candidate } from "../models/Candidate.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";
import { assertCohortAccess } from "../utils/permissions.js";
import { getCohortById } from "./cohortService.js";

function serializeAssessment(doc) {
  const json = toJSON(doc);
  json.cohort_id = json.cohort_id ? String(json.cohort_id) : null;
  json.module_id = json.module_id ? String(json.module_id) : null;
  json.created_by = json.created_by ? String(json.created_by) : null;
  return json;
}

function serializeScore(doc) {
  const json = toJSON(doc);
  json.assessment_id = json.assessment_id ? String(json.assessment_id) : null;
  json.candidate_id = json.candidate_id ? String(json.candidate_id) : null;
  return json;
}

async function loadAssessment(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Assessment not found", 404, "NOT_FOUND");
  }
  const assessment = await Assessment.findById(id);
  if (!assessment) throw new AppError("Assessment not found", 404, "NOT_FOUND");
  return assessment;
}

async function maybeClearOtherFinals(cohortId, assessmentId) {
  await Assessment.updateMany(
    { cohort_id: cohortId, _id: { $ne: assessmentId }, is_final: true },
    { $set: { is_final: false } },
  );
}

export async function listAssessments(user, cohortId) {
  await getCohortById(user, cohortId);
  const assessments = await Assessment.find({ cohort_id: cohortId }).sort({ date: -1, created_at: -1 });
  return assessments.map(serializeAssessment);
}

export async function createAssessment(user, cohortId, payload) {
  await getCohortById(user, cohortId);

  const assessment = await Assessment.create({
    cohort_id: cohortId,
    title: payload.title,
    type: payload.type,
    max_score: payload.max_score ?? 100,
    date: payload.date,
    module_id: payload.module_id ?? null,
    is_final: payload.type === "exam" ? Boolean(payload.is_final) : false,
    created_by: user.id,
  });

  if (assessment.is_final) {
    await maybeClearOtherFinals(cohortId, assessment._id);
  }

  return serializeAssessment(assessment);
}

export async function updateAssessment(user, assessmentId, payload) {
  const assessment = await loadAssessment(assessmentId);
  await assertCohortAccess(user, assessment.cohort_id);

  if (payload.title !== undefined) assessment.title = payload.title;
  if (payload.type !== undefined) assessment.type = payload.type;
  if (payload.max_score !== undefined) assessment.max_score = payload.max_score;
  if (payload.date !== undefined) assessment.date = payload.date;
  if (payload.module_id !== undefined) assessment.module_id = payload.module_id;
  if (payload.is_final !== undefined) {
    assessment.is_final = assessment.type === "exam" ? Boolean(payload.is_final) : false;
  }
  if (assessment.type !== "exam") assessment.is_final = false;

  await assessment.save();

  if (assessment.is_final) {
    await maybeClearOtherFinals(assessment.cohort_id, assessment._id);
  }

  if (assessment.type === "exam") {
    await syncExamScoresForCohort(assessment.cohort_id);
  }

  return serializeAssessment(assessment);
}

export async function getAssessmentWithScores(user, assessmentId) {
  const assessment = await loadAssessment(assessmentId);
  await assertCohortAccess(user, assessment.cohort_id);

  const [candidates, scores] = await Promise.all([
    Candidate.find({
      cohort_id: assessment.cohort_id,
      status: { $in: ["enrolled", "graduated"] },
    })
      .select("full_name candidate_code status")
      .sort({ full_name: 1 }),
    AssessmentScore.find({ assessment_id: assessment._id }),
  ]);

  const scoreByCandidate = new Map(scores.map((s) => [String(s.candidate_id), s]));

  const roster = candidates.map((c) => {
    const score = scoreByCandidate.get(String(c._id));
    return {
      candidate_id: String(c._id),
      candidate_code: c.candidate_code,
      full_name: c.full_name,
      score: score?.score ?? null,
      remarks: score?.remarks ?? null,
    };
  });

  return {
    assessment: serializeAssessment(assessment),
    roster,
    scores: scores.map(serializeScore),
  };
}

export async function upsertScores(user, assessmentId, scoresPayload) {
  const assessment = await loadAssessment(assessmentId);
  await assertCohortAccess(user, assessment.cohort_id);

  for (const row of scoresPayload) {
    if (row.score > assessment.max_score) {
      throw new AppError(
        `Score cannot exceed max score of ${assessment.max_score}`,
        400,
        "VALIDATION_ERROR",
      );
    }
  }

  const candidateIds = [...new Set(scoresPayload.map((r) => r.candidate_id))];
  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    cohort_id: assessment.cohort_id,
    status: { $in: ["enrolled", "graduated"] },
  }).select("_id");

  if (candidates.length !== candidateIds.length) {
    throw new AppError("One or more candidates are not enrolled in this cohort", 400, "VALIDATION_ERROR");
  }

  const ops = scoresPayload.map((row) => ({
    updateOne: {
      filter: { assessment_id: assessment._id, candidate_id: row.candidate_id },
      update: {
        $set: {
          score: row.score,
          remarks: row.remarks ?? null,
        },
      },
      upsert: true,
    },
  }));

  if (ops.length) {
    await AssessmentScore.bulkWrite(ops);
  }

  if (assessment.type === "exam") {
    await syncExamScoresForCohort(assessment.cohort_id, candidateIds);
  }

  return getAssessmentWithScores(user, assessmentId);
}

export async function syncExamScoresForCohort(cohortId, candidateIds = null) {
  const exams = await Assessment.find({ cohort_id: cohortId, type: "exam" }).sort({
    date: -1,
    created_at: -1,
  });
  if (exams.length === 0) return;

  const official = exams.find((e) => e.is_final) || exams[0];
  const filter = { assessment_id: official._id };
  if (candidateIds?.length) {
    filter.candidate_id = { $in: candidateIds };
  }

  const scores = await AssessmentScore.find(filter);
  if (scores.length === 0) return;

  const writes = scores.map((row) => {
    const percent = Math.round((row.score / official.max_score) * 100);
    return {
      updateOne: {
        filter: { _id: row.candidate_id },
        update: { $set: { exam_score: Math.min(100, Math.max(0, percent)) } },
      },
    };
  });

  await Candidate.bulkWrite(writes);
}

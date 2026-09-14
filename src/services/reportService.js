import { AttendanceSession } from "../models/AttendanceSession.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { Assessment } from "../models/Assessment.js";
import { AssessmentScore } from "../models/AssessmentScore.js";
import { CandidateIssue } from "../models/CandidateIssue.js";
import { Candidate } from "../models/Candidate.js";
import { toCsv } from "../utils/csv.js";
import { getCohortById } from "./cohortService.js";
import { toJSON } from "../utils/serialize.js";

function serializeIssue(doc) {
  const json = toJSON(doc);
  json.candidate_id = json.candidate_id ? String(json.candidate_id) : null;
  json.cohort_id = json.cohort_id ? String(json.cohort_id) : null;
  json.reported_by = json.reported_by ? String(json.reported_by) : null;
  return json;
}

async function roster(cohortId) {
  const candidates = await Candidate.find({
    cohort_id: cohortId,
    status: { $in: ["enrolled", "graduated"] },
  })
    .select("full_name candidate_code attendance_percentage exam_score")
    .sort({ full_name: 1 });

  return candidates.map((c) => ({
    candidate_id: String(c._id),
    candidate_code: c.candidate_code,
    full_name: c.full_name,
    attendance_percentage: c.attendance_percentage,
    exam_score: c.exam_score,
  }));
}

export async function attendanceReport(user, cohortId, { from, to } = {}) {
  const cohort = await getCohortById(user, cohortId);
  const sessionFilter = { cohort_id: cohortId };
  if (from || to) {
    sessionFilter.date = {};
    if (from) sessionFilter.date.$gte = from;
    if (to) sessionFilter.date.$lte = to;
  }

  const sessions = await AttendanceSession.find(sessionFilter).sort({ date: 1, session_label: 1 });
  const sessionIds = sessions.map((s) => s._id);
  const records = sessionIds.length
    ? await AttendanceRecord.find({ session_id: { $in: sessionIds } })
    : [];

  const recordMap = new Map();
  for (const record of records) {
    recordMap.set(`${String(record.candidate_id)}:${String(record.session_id)}`, record.status);
  }

  const candidates = await roster(cohortId);
  const sessionSummaries = sessions.map((s) => ({
    id: String(s._id),
    date: s.date,
    session_label: s.session_label,
    activity_notes: s.activity_notes,
  }));

  const rows = candidates.map((c) => {
    const by_date = {};
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    for (const session of sessionSummaries) {
      const status = recordMap.get(`${c.candidate_id}:${session.id}`) ?? "";
      const key = session.session_label === "full_day" ? session.date : `${session.date} ${session.session_label}`;
      by_date[key] = status;
      if (status === "present") present += 1;
      else if (status === "late") late += 1;
      else if (status === "absent") absent += 1;
      else if (status === "excused") excused += 1;
    }
    return { ...c, present, late, absent, excused, by_date };
  });

  return { cohort, sessions: sessionSummaries, rows };
}

export function attendanceReportCsv(data) {
  const dateHeaders = data.sessions.map((s) =>
    s.session_label === "full_day" ? s.date : `${s.date} ${s.session_label}`,
  );
  const headers = [
    "candidate_code",
    "full_name",
    "present",
    "late",
    "absent",
    "excused",
    "attendance_percentage",
    ...dateHeaders,
  ];
  const rows = data.rows.map((row) => {
    const out = {
      candidate_code: row.candidate_code,
      full_name: row.full_name,
      present: row.present,
      late: row.late,
      absent: row.absent,
      excused: row.excused,
      attendance_percentage: row.attendance_percentage ?? "",
    };
    for (const header of dateHeaders) {
      out[header] = row.by_date[header] ?? "";
    }
    return out;
  });
  return toCsv(headers, rows);
}

export async function scoresReport(user, cohortId) {
  const cohort = await getCohortById(user, cohortId);
  const assessments = await Assessment.find({ cohort_id: cohortId }).sort({ date: 1, created_at: 1 });
  const assessmentIds = assessments.map((a) => a._id);
  const scores = assessmentIds.length
    ? await AssessmentScore.find({ assessment_id: { $in: assessmentIds } })
    : [];

  const scoreMap = new Map();
  for (const score of scores) {
    scoreMap.set(`${String(score.candidate_id)}:${String(score.assessment_id)}`, score.score);
  }

  const assessmentSummaries = assessments.map((a) => ({
    id: String(a._id),
    title: a.title,
    type: a.type,
    max_score: a.max_score,
    date: a.date,
    is_final: a.is_final,
  }));

  const candidates = await roster(cohortId);
  const rows = candidates.map((c) => {
    const marks = {};
    for (const assessment of assessmentSummaries) {
      marks[assessment.id] = scoreMap.has(`${c.candidate_id}:${assessment.id}`)
        ? scoreMap.get(`${c.candidate_id}:${assessment.id}`)
        : null;
    }
    return { ...c, scores: marks };
  });

  return { cohort, assessments: assessmentSummaries, rows };
}

export function scoresReportCsv(data) {
  const assessmentHeaders = data.assessments.map((a) => `${a.title} (${a.max_score})`);
  const headers = ["candidate_code", "full_name", "exam_score", ...assessmentHeaders];
  const rows = data.rows.map((row) => {
    const out = {
      candidate_code: row.candidate_code,
      full_name: row.full_name,
      exam_score: row.exam_score ?? "",
    };
    data.assessments.forEach((assessment, index) => {
      out[assessmentHeaders[index]] = row.scores[assessment.id] ?? "";
    });
    return out;
  });
  return toCsv(headers, rows);
}

export async function issuesReport(user, cohortId, { status } = {}) {
  const cohort = await getCohortById(user, cohortId);
  const filter = { cohort_id: cohortId };
  if (status) filter.status = status;
  const issues = await CandidateIssue.find(filter).sort({ created_at: -1 });
  const candidates = await Candidate.find({
    _id: { $in: issues.map((i) => i.candidate_id) },
  }).select("full_name candidate_code");
  const byId = new Map(candidates.map((c) => [String(c._id), c]));

  const rows = issues.map((issue) => {
    const json = serializeIssue(issue);
    const candidate = byId.get(json.candidate_id);
    return {
      ...json,
      candidate_name: candidate?.full_name ?? null,
      candidate_code: candidate?.candidate_code ?? null,
    };
  });

  return { cohort, issues: rows };
}

export function issuesReportCsv(data) {
  const headers = [
    "candidate_code",
    "candidate_name",
    "category",
    "severity",
    "status",
    "title",
    "description",
    "resolution_notes",
    "created_at",
    "resolved_at",
  ];
  const rows = data.issues.map((issue) => ({
    candidate_code: issue.candidate_code,
    candidate_name: issue.candidate_name,
    category: issue.category,
    severity: issue.severity,
    status: issue.status,
    title: issue.title,
    description: issue.description,
    resolution_notes: issue.resolution_notes,
    created_at: issue.created_at,
    resolved_at: issue.resolved_at,
  }));
  return toCsv(headers, rows);
}

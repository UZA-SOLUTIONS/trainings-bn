import mongoose from "mongoose";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { Candidate } from "../models/Candidate.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";
import { assertCohortAccess } from "../utils/permissions.js";
import { getCohortById } from "./cohortService.js";

const COUNTED_PRESENT = new Set(["present", "late", "excused"]);

function serializeSession(doc) {
  const json = toJSON(doc);
  json.cohort_id = json.cohort_id ? String(json.cohort_id) : null;
  json.recorded_by = json.recorded_by ? String(json.recorded_by) : null;
  return json;
}

function serializeRecord(doc) {
  const json = toJSON(doc);
  json.session_id = json.session_id ? String(json.session_id) : null;
  json.candidate_id = json.candidate_id ? String(json.candidate_id) : null;
  return json;
}

async function loadSession(sessionId) {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw new AppError("Attendance session not found", 404, "NOT_FOUND");
  }
  const session = await AttendanceSession.findById(sessionId);
  if (!session) throw new AppError("Attendance session not found", 404, "NOT_FOUND");
  return session;
}

export async function listSessions(user, cohortId, { date, session_label } = {}) {
  await getCohortById(user, cohortId);

  const filter = { cohort_id: cohortId };
  if (date) filter.date = date;
  if (session_label) filter.session_label = session_label;

  const sessions = await AttendanceSession.find(filter).sort({ date: -1, session_label: 1 });
  return toJSONList(sessions).map((s) => ({
    ...s,
    cohort_id: String(s.cohort_id),
    recorded_by: s.recorded_by ? String(s.recorded_by) : null,
  }));
}

export async function createSession(user, cohortId, payload) {
  await getCohortById(user, cohortId);

  const existing = await AttendanceSession.findOne({
    cohort_id: cohortId,
    date: payload.date,
    session_label: payload.session_label ?? "full_day",
  });

  if (existing) {
    if (payload.activity_notes !== undefined) {
      existing.activity_notes = payload.activity_notes;
      existing.recorded_by = user.id;
      await existing.save();
    }
    return serializeSession(existing);
  }

  try {
    const session = await AttendanceSession.create({
      cohort_id: cohortId,
      date: payload.date,
      session_label: payload.session_label ?? "full_day",
      activity_notes: payload.activity_notes ?? null,
      recorded_by: user.id,
    });
    return serializeSession(session);
  } catch (err) {
    if (err.code === 11000) {
      const session = await AttendanceSession.findOne({
        cohort_id: cohortId,
        date: payload.date,
        session_label: payload.session_label ?? "full_day",
      });
      if (session) return serializeSession(session);
    }
    throw new AppError(err.message, 400, "ATTENDANCE_SESSION_FAILED");
  }
}

export async function updateSession(user, sessionId, payload) {
  const session = await loadSession(sessionId);
  await assertCohortAccess(user, session.cohort_id);

  if (payload.activity_notes !== undefined) session.activity_notes = payload.activity_notes;
  if (payload.session_label !== undefined) session.session_label = payload.session_label;
  session.recorded_by = user.id;
  await session.save();
  return serializeSession(session);
}

export async function getSessionWithRoster(user, sessionId) {
  const session = await loadSession(sessionId);
  await assertCohortAccess(user, session.cohort_id);

  const [candidates, records] = await Promise.all([
    Candidate.find({
      cohort_id: session.cohort_id,
      status: { $in: ["enrolled", "graduated"] },
    })
      .select("full_name candidate_code status training_status")
      .sort({ full_name: 1 }),
    AttendanceRecord.find({ session_id: session._id }),
  ]);

  const recordByCandidate = new Map(records.map((r) => [String(r.candidate_id), r]));

  const roster = candidates.map((c) => {
    const record = recordByCandidate.get(String(c._id));
    return {
      candidate_id: String(c._id),
      candidate_code: c.candidate_code,
      full_name: c.full_name,
      status: record?.status ?? null,
      note: record?.note ?? null,
    };
  });

  return {
    session: serializeSession(session),
    roster,
    records: records.map(serializeRecord),
  };
}

export async function upsertRecords(user, sessionId, recordsPayload) {
  const session = await loadSession(sessionId);
  await assertCohortAccess(user, session.cohort_id);

  const candidateIds = [...new Set(recordsPayload.map((r) => r.candidate_id))];
  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    cohort_id: session.cohort_id,
    status: { $in: ["enrolled", "graduated"] },
  }).select("_id");

  if (candidates.length !== candidateIds.length) {
    throw new AppError("One or more candidates are not enrolled in this cohort", 400, "VALIDATION_ERROR");
  }

  const ops = recordsPayload.map((row) => ({
    updateOne: {
      filter: { session_id: session._id, candidate_id: row.candidate_id },
      update: {
        $set: {
          status: row.status,
          note: row.note ?? null,
        },
      },
      upsert: true,
    },
  }));

  if (ops.length) {
    await AttendanceRecord.bulkWrite(ops);
  }

  session.recorded_by = user.id;
  await session.save();

  await recomputeAttendancePercentages(session.cohort_id);

  return getSessionWithRoster(user, sessionId);
}

export async function recomputeAttendancePercentages(cohortId) {
  const sessions = await AttendanceSession.find({ cohort_id: cohortId }).select("_id");
  const sessionIds = sessions.map((s) => s._id);
  if (sessionIds.length === 0) return;

  const records = await AttendanceRecord.find({ session_id: { $in: sessionIds } }).select(
    "candidate_id status",
  );

  const byCandidate = new Map();
  for (const record of records) {
    const id = String(record.candidate_id);
    const current = byCandidate.get(id) ?? { total: 0, attended: 0 };
    current.total += 1;
    if (COUNTED_PRESENT.has(record.status)) current.attended += 1;
    byCandidate.set(id, current);
  }

  const writes = [];
  for (const [candidateId, stats] of byCandidate.entries()) {
    const percentage = stats.total === 0 ? null : Math.round((stats.attended / stats.total) * 100);
    writes.push({
      updateOne: {
        filter: { _id: candidateId },
        update: { $set: { attendance_percentage: percentage } },
      },
    });
  }

  if (writes.length) {
    await Candidate.bulkWrite(writes);
  }
}

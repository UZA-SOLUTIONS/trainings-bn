import * as attendanceService from "../services/attendanceService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await attendanceService.listSessions(req.user, req.params.id, req.query);
  return success(res, { sessions }, "Attendance sessions retrieved successfully");
});

export const createSession = asyncHandler(async (req, res) => {
  const session = await attendanceService.createSession(req.user, req.params.id, req.body);
  return success(res, { session }, "Attendance session saved successfully", 201);
});

export const getSession = asyncHandler(async (req, res) => {
  const data = await attendanceService.getSessionWithRoster(req.user, req.params.sessionId);
  return success(res, data, "Attendance session retrieved successfully");
});

export const updateSession = asyncHandler(async (req, res) => {
  const session = await attendanceService.updateSession(req.user, req.params.sessionId, req.body);
  return success(res, { session }, "Attendance session updated successfully");
});

export const upsertRecords = asyncHandler(async (req, res) => {
  const data = await attendanceService.upsertRecords(req.user, req.params.sessionId, req.body.records);
  return success(res, data, "Attendance records saved successfully");
});

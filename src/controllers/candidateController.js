import * as candidateService from "../services/candidateService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const create = asyncHandler(async (req, res) => {
  const candidate = await candidateService.createCandidate(req.body);
  return success(res, { candidate }, "Application submitted successfully", 201);
});

export const createIntake = asyncHandler(async (req, res) => {
  const candidate = await candidateService.createIntakeRosterCandidate(req.user, req.body);
  return success(res, { candidate }, "Candidate added to intake", 201);
});

export const bulkCreateIntake = asyncHandler(async (req, res) => {
  const result = await candidateService.bulkCreateIntakeRoster(req.user, req.body);
  return success(res, result, "Bulk add finished", 201);
});

export const list = asyncHandler(async (req, res) => {
  const candidates = await candidateService.listCandidates(req.user, {
    cohortId: req.query.cohortId,
  });
  return success(res, { candidates }, "Candidates retrieved successfully");
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await candidateService.getCandidateForStaff(req.user, req.params.id);
  return success(res, data, "Candidate retrieved successfully");
});

export const update = asyncHandler(async (req, res) => {
  const candidate = await candidateService.updateCandidate(req.user, req.params.id, req.body);
  return success(res, { candidate }, "Candidate updated successfully");
});

export const remove = asyncHandler(async (req, res) => {
  const result = await candidateService.deleteCandidate(req.user, req.params.id);
  return success(res, result, "Candidate deleted successfully");
});

export const track = asyncHandler(async (req, res) => {
  const result = await candidateService.trackByCode(req.params.code);
  if (result.type === "bank") {
    return success(res, { type: "bank", bank: result.bank }, "Bank portfolio retrieved");
  }
  return success(res, { type: "candidate", track: result.track }, "Application status retrieved");
});

export const candidateLogin = asyncHandler(async (req, res) => {
  const result = await candidateService.loginCandidateByCode(req.body.candidate_code);
  return success(res, result, "Logged in successfully");
});

export const candidateMe = asyncHandler(async (req, res) => {
  const result = await candidateService.getCandidateAccount(req.user.id);
  return success(res, result, "Candidate account retrieved");
});

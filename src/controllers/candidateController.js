import * as candidateService from "../services/candidateService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const create = asyncHandler(async (req, res) => {
  const candidate = await candidateService.createCandidate(req.body);
  return success(res, { candidate }, "Application submitted successfully", 201);
});

export const list = asyncHandler(async (req, res) => {
  const candidates = await candidateService.listCandidates({
    cohortId: req.query.cohortId,
  });
  return success(res, { candidates }, "Candidates retrieved successfully");
});

export const update = asyncHandler(async (req, res) => {
  const candidate = await candidateService.updateCandidate(req.params.id, req.body);
  return success(res, { candidate }, "Candidate updated successfully");
});

import * as cohortService from "../services/cohortService.js";
import * as candidateService from "../services/candidateService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  const openOnly = !req.user || req.query.open === "true";
  const cohorts = await cohortService.listCohorts(req.user ?? null, { openOnly });
  return success(res, { cohorts }, "Cohorts retrieved successfully");
});

export const getOne = asyncHandler(async (req, res) => {
  const cohort = await cohortService.getCohortById(req.user, req.params.id);
  const candidates = await candidateService.listCandidates(req.user, {
    cohortId: req.params.id,
  });
  return success(res, { cohort, candidates }, "Cohort retrieved successfully");
});

export const create = asyncHandler(async (req, res) => {
  const cohort = await cohortService.createCohort(req.body);
  return success(res, { cohort }, "Cohort created successfully", 201);
});

export const update = asyncHandler(async (req, res) => {
  const cohort = await cohortService.updateCohort(req.params.id, req.body);
  return success(res, { cohort }, "Cohort updated successfully");
});

export const remove = asyncHandler(async (req, res) => {
  const cohort = await cohortService.deleteCohort(req.params.id);
  return success(res, { cohort }, "Cohort deleted successfully");
});

export const overview = asyncHandler(async (req, res) => {
  const [cohorts, candidates] = await Promise.all([
    cohortService.listCohorts(req.user, { openOnly: false }),
    candidateService.listCandidatesSummary(req.user),
  ]);
  return success(res, { cohorts, candidates }, "Overview retrieved successfully");
});

import * as issueService from "../services/issueService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const listForCohort = asyncHandler(async (req, res) => {
  const issues = await issueService.listCohortIssues(req.user, req.params.id, req.query);
  return success(res, { issues }, "Issues retrieved successfully");
});

export const createForCohort = asyncHandler(async (req, res) => {
  const issue = await issueService.createCohortIssue(req.user, req.params.id, req.body);
  return success(res, { issue }, "Issue reported successfully", 201);
});

export const listForCandidate = asyncHandler(async (req, res) => {
  const issues = await issueService.listCandidateIssues(req.user, req.params.id);
  return success(res, { issues }, "Issues retrieved successfully");
});

export const createForCandidate = asyncHandler(async (req, res) => {
  const issue = await issueService.createCandidateIssue(req.user, req.params.id, req.body);
  return success(res, { issue }, "Issue reported successfully", 201);
});

export const update = asyncHandler(async (req, res) => {
  const issue = await issueService.updateIssue(req.user, req.params.issueId, req.body);
  return success(res, { issue }, "Issue updated successfully");
});

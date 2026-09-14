import * as assessmentService from "../services/assessmentService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  const assessments = await assessmentService.listAssessments(req.user, req.params.id);
  return success(res, { assessments }, "Assessments retrieved successfully");
});

export const create = asyncHandler(async (req, res) => {
  const assessment = await assessmentService.createAssessment(req.user, req.params.id, req.body);
  return success(res, { assessment }, "Assessment created successfully", 201);
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await assessmentService.getAssessmentWithScores(req.user, req.params.assessmentId);
  return success(res, data, "Assessment retrieved successfully");
});

export const update = asyncHandler(async (req, res) => {
  const assessment = await assessmentService.updateAssessment(
    req.user,
    req.params.assessmentId,
    req.body,
  );
  return success(res, { assessment }, "Assessment updated successfully");
});

export const upsertScores = asyncHandler(async (req, res) => {
  const data = await assessmentService.upsertScores(
    req.user,
    req.params.assessmentId,
    req.body.scores,
  );
  return success(res, data, "Assessment scores saved successfully");
});

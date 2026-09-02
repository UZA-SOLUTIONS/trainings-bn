import * as moduleService from "../services/moduleService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  const modules = await moduleService.listModules({
    courseId: req.query.course_id || undefined,
  });
  return success(res, { modules }, "Modules retrieved successfully");
});

export const getOne = asyncHandler(async (req, res) => {
  const module = await moduleService.getModuleById(req.params.id);
  return success(res, { module }, "Module retrieved successfully");
});

export const create = asyncHandler(async (req, res) => {
  const module = await moduleService.createModule(req.body);
  return success(res, { module }, "Module created successfully", 201);
});

export const update = asyncHandler(async (req, res) => {
  const module = await moduleService.updateModule(req.params.id, req.body);
  return success(res, { module }, "Module updated successfully");
});

export const remove = asyncHandler(async (req, res) => {
  const module = await moduleService.deleteModule(req.params.id);
  return success(res, { module }, "Module deleted successfully");
});

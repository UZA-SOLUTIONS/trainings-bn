import * as courseService from "../services/courseService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (_req, res) => {
  const courses = await courseService.listCourses();
  return success(res, { courses }, "Courses retrieved successfully");
});

export const getOne = asyncHandler(async (req, res) => {
  const data = await courseService.getCourseById(req.params.id);
  return success(res, data, "Course retrieved successfully");
});

export const create = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(req.body);
  return success(res, { course }, "Course created successfully", 201);
});

export const update = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(req.params.id, req.body);
  return success(res, { course }, "Course updated successfully");
});

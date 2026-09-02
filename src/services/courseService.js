import mongoose from "mongoose";
import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { AppError } from "../utils/errors.js";
import { toJSON, toJSONList } from "../utils/serialize.js";

function serializeCourse(doc) {
  const json = toJSON(doc);
  return json;
}

export async function listCourses({ activeOnly = false } = {}) {
  const filter = activeOnly ? { status: "active" } : {};
  const courses = await Course.find(filter).sort({ name: 1 });
  const list = toJSONList(courses);
  const counts = await TrainingModule.aggregate([
    ...(activeOnly
      ? [{ $match: { status: "active" } }]
      : []),
    { $group: { _id: "$course_id", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  return list.map((course) => ({
    ...course,
    module_count: countMap.get(course.id) ?? 0,
  }));
}

export async function getCourseById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Course not found", 404, "NOT_FOUND");
  }
  const course = await Course.findById(id);
  if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");
  const modules = await TrainingModule.find({ course_id: id }).sort({ sort_order: 1 });
  return {
    course: serializeCourse(course),
    modules: toJSONList(modules).map((m) => ({
      ...m,
      course_id: String(m.course_id),
    })),
  };
}

export async function createCourse(payload) {
  try {
    const course = await Course.create(payload);
    return { ...serializeCourse(course), module_count: 0 };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("A course with this code already exists", 409, "DUPLICATE_CODE");
    }
    throw new AppError(err.message, 400, "COURSE_CREATE_FAILED");
  }
}

export async function updateCourse(id, payload) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Course not found", 404, "NOT_FOUND");
  }
  try {
    const course = await Course.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");
    const moduleCount = await TrainingModule.countDocuments({ course_id: id });
    return { ...serializeCourse(course), module_count: moduleCount };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.code === 11000) {
      throw new AppError("A course with this code already exists", 409, "DUPLICATE_CODE");
    }
    throw new AppError(err.message, 400, "COURSE_UPDATE_FAILED");
  }
}

export async function deleteCourse(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Course not found", 404, "NOT_FOUND");
  }
  const course = await Course.findByIdAndDelete(id);
  if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");
  await TrainingModule.deleteMany({ course_id: id });
  return { ...serializeCourse(course), module_count: 0 };
}

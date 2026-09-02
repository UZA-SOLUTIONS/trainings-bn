import mongoose from "mongoose";
import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";

function serializeModule(doc) {
  const json = toJSON(doc);
  json.course_id = json.course_id ? String(json.course_id) : null;
  return json;
}

export async function listModules({ courseId, activeOnly = false } = {}) {
  const filter = {};
  if (activeOnly) filter.status = "active";
  if (courseId) {
    if (!mongoose.isValidObjectId(courseId)) {
      throw new AppError("Course not found", 404, "NOT_FOUND");
    }
    filter.course_id = courseId;
  }

  const modules = await TrainingModule.find(filter)
    .populate("course_id", "name code status")
    .sort({ sort_order: 1, name: 1 });

  return modules
    .filter((doc) => {
      if (!activeOnly) return true;
      const course = doc.course_id;
      return course && typeof course === "object" && course.status === "active";
    })
    .map((doc) => {
      const json = serializeModule(doc);
      const course = doc.course_id;
      if (course && typeof course === "object" && course.name) {
        json.course_id = String(course._id);
        json.course_name = course.name;
        json.course_code = course.code;
      }
      return json;
    });
}

export async function getModuleById(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Module not found", 404, "NOT_FOUND");
  }
  const mod = await TrainingModule.findById(id).populate("course_id", "name code");
  if (!mod) throw new AppError("Module not found", 404, "NOT_FOUND");
  const json = serializeModule(mod);
  if (mod.course_id && typeof mod.course_id === "object") {
    json.course_id = String(mod.course_id._id);
    json.course_name = mod.course_id.name;
    json.course_code = mod.course_id.code;
  }
  return json;
}

export async function createModule(payload) {
  if (!mongoose.isValidObjectId(payload.course_id)) {
    throw new AppError("Course not found", 404, "NOT_FOUND");
  }
  const course = await Course.findById(payload.course_id);
  if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");

  try {
    const mod = await TrainingModule.create(payload);
    return serializeModule(mod);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("A module with this code already exists in the course", 409, "DUPLICATE_CODE");
    }
    throw new AppError(err.message, 400, "MODULE_CREATE_FAILED");
  }
}

export async function updateModule(id, payload) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Module not found", 404, "NOT_FOUND");
  }
  if (payload.course_id && !mongoose.isValidObjectId(payload.course_id)) {
    throw new AppError("Course not found", 404, "NOT_FOUND");
  }
  if (payload.course_id) {
    const course = await Course.findById(payload.course_id);
    if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");
  }

  try {
    const mod = await TrainingModule.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!mod) throw new AppError("Module not found", 404, "NOT_FOUND");
    return serializeModule(mod);
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.code === 11000) {
      throw new AppError("A module with this code already exists in the course", 409, "DUPLICATE_CODE");
    }
    throw new AppError(err.message, 400, "MODULE_UPDATE_FAILED");
  }
}

export async function deleteModule(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Module not found", 404, "NOT_FOUND");
  }
  const mod = await TrainingModule.findByIdAndDelete(id);
  if (!mod) throw new AppError("Module not found", 404, "NOT_FOUND");
  return serializeModule(mod);
}

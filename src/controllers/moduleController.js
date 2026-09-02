import * as moduleService from "../services/moduleService.js";
import { success } from "../utils/response.js";
import { asyncHandler, AppError } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  const activeOnly = !req.user || req.query.active === "true";
  const modules = await moduleService.listModules({
    courseId: req.query.course_id || undefined,
    activeOnly,
  });
  return success(res, { modules }, "Modules retrieved successfully");
});

export const getOne = asyncHandler(async (req, res) => {
  const module = await moduleService.getModuleById(req.params.id);
  if (!req.user || !["admin", "instructor"].includes(req.user.role)) {
    if (module.status !== "active") {
      throw new AppError("Module not found", 404, "NOT_FOUND");
    }
  }
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

export const downloadAttachment = asyncHandler(async (req, res) => {
  const staff = req.user && ["admin", "instructor"].includes(req.user.role);
  const file = await moduleService.getModuleAttachment(req.params.id, req.params.attachmentId, {
    allowDraft: Boolean(staff),
  });
  const buffer = Buffer.from(file.data, "base64");
  res.setHeader("Content-Type", file.mime_type);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  );
  res.setHeader("Content-Length", buffer.length);
  return res.send(buffer);
});

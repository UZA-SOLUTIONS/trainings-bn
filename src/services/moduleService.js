import mongoose from "mongoose";
import { Course } from "../models/Course.js";
import { TrainingModule } from "../models/TrainingModule.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";

const MAX_ATTACHMENT_BYTES = 2_500_000;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function serializeAttachment(att, { includeData = false } = {}) {
  const json = {
    id: String(att._id || att.id),
    name: att.name,
    mime_type: att.mime_type,
    size: att.size,
  };
  if (includeData && att.data) json.data = att.data;
  return json;
}

function serializeContents(sections = []) {
  return [...sections]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .map((s, index) => ({
      id: s._id ? String(s._id) : s.id ? String(s.id) : undefined,
      title: s.title,
      body: s.body || "",
      sort_order: s.sort_order ?? index + 1,
    }));
}

function serializeModule(doc, { includeAttachmentData = false } = {}) {
  const json = toJSON(doc);
  json.course_id = json.course_id ? String(json.course_id) : null;
  json.content = json.content ?? null;
  json.contents = serializeContents(doc.contents || json.contents || []);
  json.attachments = (doc.attachments || []).map((att) =>
    serializeAttachment(att, { includeData: includeAttachmentData }),
  );
  return json;
}

function normalizeContents(sections = []) {
  return sections.map((s, index) => ({
    title: String(s.title || "").trim(),
    body: s.body == null ? "" : String(s.body),
    sort_order: s.sort_order ?? index + 1,
  }));
}

function estimateBase64Bytes(data) {
  if (!data) return 0;
  const cleaned = String(data).replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  return Math.floor((cleaned.length * 3) / 4);
}

function stripDataUrl(data) {
  return String(data || "").replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
}

function guessMimeFromName(name = "") {
  const ext = String(name).split(".").pop()?.toLowerCase();
  const map = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    md: "text/markdown",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  return map[ext] || null;
}

async function resolveAttachments(incoming, existingDocs = []) {
  if (!Array.isArray(incoming)) return undefined;

  const byId = new Map(existingDocs.map((a) => [String(a._id), a]));
  const resolved = [];

  for (const att of incoming) {
    const existing = att.id ? byId.get(String(att.id)) : null;

    if (existing && !att.data) {
      resolved.push({
        _id: existing._id,
        name: (att.name || existing.name).trim(),
        mime_type: existing.mime_type,
        size: existing.size,
        data: existing.data,
      });
      continue;
    }

    if (!att.data) {
      throw new AppError("New attachments must include file data", 400, "ATTACHMENT_DATA_REQUIRED");
    }

    const data = stripDataUrl(att.data);
    const size = att.size || estimateBase64Bytes(data);
    const mime = (
      att.mime_type ||
      existing?.mime_type ||
      guessMimeFromName(att.name) ||
      ""
    ).trim();

    if (size > MAX_ATTACHMENT_BYTES) {
      throw new AppError(
        `Attachment “${att.name}” exceeds the ${Math.round(MAX_ATTACHMENT_BYTES / 1_000_000)}MB limit`,
        400,
        "ATTACHMENT_TOO_LARGE",
      );
    }
    if (!ALLOWED_MIME.has(mime)) {
      throw new AppError(
        `File type not allowed for “${att.name}”. Use PDF, Word, PowerPoint, text, or image files.`,
        400,
        "ATTACHMENT_TYPE_NOT_ALLOWED",
      );
    }

    resolved.push({
      ...(existing?._id ? { _id: existing._id } : {}),
      name: String(att.name || "file").trim(),
      mime_type: mime,
      size,
      data,
    });
  }

  return resolved;
}

function buildPayload(payload, attachments) {
  const next = { ...payload };
  if (payload.content !== undefined) {
    next.content = payload.content?.trim() ? payload.content.trim() : null;
  }
  if (payload.description !== undefined) {
    next.description = payload.description?.trim() ? payload.description.trim() : null;
  }
  if (payload.contents !== undefined) {
    next.contents = normalizeContents(payload.contents);
  }
  if (attachments !== undefined) {
    next.attachments = attachments;
  }
  return next;
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
    .select("-attachments.data")
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

export async function getModuleById(id, { includeAttachmentData = false } = {}) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Module not found", 404, "NOT_FOUND");
  }
  const query = TrainingModule.findById(id).populate("course_id", "name code status");
  if (!includeAttachmentData) query.select("-attachments.data");
  const mod = await query;
  if (!mod) throw new AppError("Module not found", 404, "NOT_FOUND");
  const json = serializeModule(mod, { includeAttachmentData });
  if (mod.course_id && typeof mod.course_id === "object") {
    json.course_id = String(mod.course_id._id);
    json.course_name = mod.course_id.name;
    json.course_code = mod.course_id.code;
    json.course_status = mod.course_id.status;
  }
  return json;
}

export async function createModule(payload) {
  if (!mongoose.isValidObjectId(payload.course_id)) {
    throw new AppError("Course not found", 404, "NOT_FOUND");
  }
  const course = await Course.findById(payload.course_id);
  if (!course) throw new AppError("Course not found", 404, "NOT_FOUND");

  const attachments = await resolveAttachments(payload.attachments || [], []);
  const body = buildPayload(payload, attachments);

  try {
    const mod = await TrainingModule.create(body);
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

  const existing = await TrainingModule.findById(id);
  if (!existing) throw new AppError("Module not found", 404, "NOT_FOUND");

  const attachments =
    payload.attachments !== undefined
      ? await resolveAttachments(payload.attachments, existing.attachments || [])
      : undefined;
  const body = buildPayload(payload, attachments);

  try {
    Object.assign(existing, body);
    await existing.save();
    return serializeModule(existing);
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

export async function getModuleAttachment(moduleId, attachmentId, { allowDraft = false } = {}) {
  if (!mongoose.isValidObjectId(moduleId) || !mongoose.isValidObjectId(attachmentId)) {
    throw new AppError("Attachment not found", 404, "NOT_FOUND");
  }
  const mod = await TrainingModule.findById(moduleId);
  if (!mod) throw new AppError("Module not found", 404, "NOT_FOUND");
  if (!allowDraft && mod.status !== "active") {
    throw new AppError("Module not found", 404, "NOT_FOUND");
  }
  const att = (mod.attachments || []).find((a) => String(a._id) === String(attachmentId));
  if (!att) throw new AppError("Attachment not found", 404, "NOT_FOUND");
  return {
    name: att.name,
    mime_type: att.mime_type,
    size: att.size,
    data: att.data,
  };
}

import mongoose from "mongoose";

const contentSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    sort_order: { type: Number, default: 1, min: 1 },
  },
  { _id: true },
);

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mime_type: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 1 },
    data: { type: String, required: true },
  },
  { _id: true },
);

const moduleSchema = new mongoose.Schema(
  {
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    /** Full narrative / lesson body for the module */
    content: { type: String, default: null },
    /** Ordered table of contents with section bodies */
    contents: { type: [contentSectionSchema], default: [] },
    /** Uploaded materials (PDF, docs, images) stored as base64 */
    attachments: { type: [attachmentSchema], default: [] },
    sort_order: { type: Number, default: 1, min: 1 },
    duration_hours: { type: Number, default: 4, min: 0 },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "active",
      index: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

moduleSchema.index({ course_id: 1, code: 1 }, { unique: true });
moduleSchema.index({ course_id: 1, sort_order: 1 });

export const TrainingModule = mongoose.model("TrainingModule", moduleSchema);

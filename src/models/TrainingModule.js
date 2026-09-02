import mongoose from "mongoose";

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

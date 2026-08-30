import mongoose from "mongoose";

const staffUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    full_name: { type: String, trim: true },
    role: { type: String, enum: ["admin", "instructor"], default: "instructor", required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const StaffUser = mongoose.model("StaffUser", staffUserSchema);

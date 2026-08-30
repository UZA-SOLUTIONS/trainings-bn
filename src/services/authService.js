import bcrypt from "bcryptjs";
import { StaffUser } from "../models/StaffUser.js";
import { signAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";

function publicUser(doc) {
  const user = toJSON(doc);
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    created_at: user.created_at,
  };
}

export async function registerStaff({ email, password, full_name }) {
  const normalized = email.toLowerCase().trim();

  const existing = await StaffUser.findOne({ email: normalized }).lean();
  if (existing) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
  }

  const adminCount = await StaffUser.countDocuments({ role: "admin" });
  const role = adminCount === 0 ? "admin" : "instructor";
  const password_hash = await bcrypt.hash(password, 12);

  try {
    const user = await StaffUser.create({
      email: normalized,
      password_hash,
      full_name,
      role,
    });

    const token = signAccessToken({
      sub: String(user._id),
      email: user.email,
      role: user.role,
    });

    return { user: publicUser(user), token };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }
    throw new AppError(err.message, 400, "REGISTER_FAILED");
  }
}

export async function loginStaff({ email, password }) {
  const normalized = email.toLowerCase().trim();
  const user = await StaffUser.findOne({ email: normalized });

  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const token = signAccessToken({
    sub: String(user._id),
    email: user.email,
    role: user.role,
  });

  return { user: publicUser(user), token };
}

export async function getStaffById(id) {
  const user = await StaffUser.findById(id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  return publicUser(user);
}

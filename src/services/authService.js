import bcrypt from "bcryptjs";
import { StaffUser } from "../models/StaffUser.js";
import { signAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { toJSON } from "../utils/serialize.js";
import { FinancingInstitution } from "../models/FinancingInstitution.js";
import { tokenPayloadForUser } from "../utils/permissions.js";

function publicUser(doc) {
  const user = toJSON(doc);
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    institution_id: user.institution_id ? String(user.institution_id) : null,
    created_at: user.created_at,
  };
}

async function validateInstitutionForRole(role, institution_id) {
  if (role === "bank_partner") {
    if (!institution_id) {
      throw new AppError("Bank partners must be assigned to an institution", 400, "VALIDATION_ERROR");
    }
    const institution = await FinancingInstitution.findById(institution_id);
    if (!institution) {
      throw new AppError("Institution not found", 404, "NOT_FOUND");
    }
    return institution._id;
  }
  return null;
}

export async function registerStaff({ email, password, full_name }) {
  const normalized = email.toLowerCase().trim();

  const existing = await StaffUser.findOne({ email: normalized }).lean();
  if (existing) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
  }

  const adminCount = await StaffUser.countDocuments({ role: "admin" });
  if (adminCount > 0) {
    throw new AppError(
      "Public registration is disabled. Ask an admin to create your account.",
      403,
      "REGISTRATION_DISABLED",
    );
  }

  const password_hash = await bcrypt.hash(password, 12);

  try {
    const user = await StaffUser.create({
      email: normalized,
      password_hash,
      full_name,
      role: "admin",
    });

    const token = signAccessToken(tokenPayloadForUser(user));

    return { user: publicUser(user), token };
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }
    throw new AppError(err.message, 400, "REGISTER_FAILED");
  }
}

export async function createStaffAccount(
  { email, password, full_name, role, institution_id },
  actor,
) {
  if (actor.role !== "admin") {
    throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const normalized = email.toLowerCase().trim();
  const existing = await StaffUser.findOne({ email: normalized }).lean();
  if (existing) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
  }

  const resolvedInstitutionId = await validateInstitutionForRole(role, institution_id);
  const password_hash = await bcrypt.hash(password, 12);

  try {
    const user = await StaffUser.create({
      email: normalized,
      password_hash,
      full_name,
      role,
      institution_id: resolvedInstitutionId,
    });

    return publicUser(user);
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
    }
    throw new AppError(err.message, 400, "STAFF_CREATE_FAILED");
  }
}

export async function listStaffAccounts(actor) {
  if (actor.role !== "admin") {
    throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
  }

  const users = await StaffUser.find().sort({ created_at: -1 });
  return users.map(publicUser);
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

  const token = signAccessToken(tokenPayloadForUser(user));

  return { user: publicUser(user), token };
}

export async function getStaffById(id) {
  const user = await StaffUser.findById(id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }
  return publicUser(user);
}

export async function updateStaffProfile(id, { full_name, email }) {
  const user = await StaffUser.findById(id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const normalized = email.toLowerCase().trim();
  const taken = await StaffUser.findOne({ email: normalized, _id: { $ne: id } }).lean();
  if (taken) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_EXISTS");
  }

  user.full_name = full_name.trim();
  user.email = normalized;
  await user.save();

  return publicUser(user);
}

export async function changeStaffPassword(id, { current_password, new_password }) {
  const user = await StaffUser.findById(id);
  if (!user) {
    throw new AppError("User not found", 404, "NOT_FOUND");
  }

  const ok = await bcrypt.compare(current_password, user.password_hash);
  if (!ok) {
    throw new AppError("Current password is incorrect", 401, "INVALID_PASSWORD");
  }

  user.password_hash = await bcrypt.hash(new_password, 12);
  await user.save();

  return publicUser(user);
}

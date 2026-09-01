import * as authService from "../services/authService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerStaff(req.body);
  return success(res, result, "Account created successfully", 201);
});

export const createStaff = asyncHandler(async (req, res) => {
  const user = await authService.createStaffAccount(req.body, req.user);
  return success(res, { user }, "Staff account created successfully", 201);
});

export const listStaff = asyncHandler(async (req, res) => {
  const users = await authService.listStaffAccounts(req.user);
  return success(res, { users }, "Staff accounts retrieved successfully");
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginStaff(req.body);
  return success(res, result, "Logged in successfully");
});

export const logout = asyncHandler(async (req, res) => {
  return success(res, null, "Logged out successfully");
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getStaffById(req.user.id);
  return success(res, { user }, "User retrieved successfully");
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateStaffProfile(req.user.id, req.body);
  return success(res, { user }, "Profile updated successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await authService.changeStaffPassword(req.user.id, req.body);
  return success(res, { user }, "Password updated successfully");
});

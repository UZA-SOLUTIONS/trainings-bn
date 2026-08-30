import * as authService from "../services/authService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerStaff(req.body);
  return success(res, result, "Account created successfully", 201);
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

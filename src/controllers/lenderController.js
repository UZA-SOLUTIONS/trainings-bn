import * as lenderFileService from "../services/lenderFileService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const listFiles = asyncHandler(async (req, res) => {
  const files = await lenderFileService.listLenderFiles(req.user);
  return success(res, { files }, "Lender files retrieved successfully");
});

export const getFile = asyncHandler(async (req, res) => {
  const file = await lenderFileService.getLenderFile(req.user, req.params.code);
  return success(res, { file }, "Lender file retrieved successfully");
});

export const updateFile = asyncHandler(async (req, res) => {
  const file = await lenderFileService.updateLenderFile(req.user, req.params.code, req.body);
  return success(res, { file }, "Lender file updated successfully");
});

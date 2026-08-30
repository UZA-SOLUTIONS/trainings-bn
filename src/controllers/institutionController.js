import * as institutionService from "../services/institutionService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  const activeOnly = req.user ? req.query.activeOnly !== "false" : true;
  const staffAll = Boolean(req.user) && req.query.activeOnly === "false";
  const institutions = await institutionService.listInstitutions({
    activeOnly: staffAll ? false : activeOnly,
  });
  return success(res, { institutions }, "Institutions retrieved successfully");
});

export const create = asyncHandler(async (req, res) => {
  const institution = await institutionService.createInstitution(req.body);
  return success(res, { institution }, "Institution created successfully", 201);
});

export const update = asyncHandler(async (req, res) => {
  const institution = await institutionService.updateInstitution(req.params.id, req.body);
  return success(res, { institution }, "Institution updated successfully");
});

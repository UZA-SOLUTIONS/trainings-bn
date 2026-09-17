import { Router } from "express";
import { authenticateCatalogueOrStaff } from "../middleware/catalogueAuthMiddleware.js";
import { exportPublishedCatalogue } from "../services/catalogueExportService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

const router = Router();

router.get(
  "/export",
  authenticateCatalogueOrStaff,
  asyncHandler(async (_req, res) => {
    const catalogue = await exportPublishedCatalogue();
    return success(res, catalogue, "Published catalogue exported");
  }),
);

export default router;

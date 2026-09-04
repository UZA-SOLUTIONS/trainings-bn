import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { authenticateGarageOrStaff } from "../middleware/garageAuthMiddleware.js";
import * as garageService from "../services/garageService.js";
import { success } from "../utils/response.js";
import { asyncHandler } from "../utils/errors.js";

/**
 * Garage vehicle health + updates.
 * Track page reads via candidate track view; garage posts here.
 */
const router = Router();

router.get(
  "/catalogue",
  (_req, res) =>
    success(res, { endpoints: garageService.GARAGE_ENDPOINTS }, "Garage endpoints"),
);

/** Latest health snapshot — staff / bank */
router.get(
  "/:uzaId",
  authenticate,
  authorizeRoles("admin", "instructor", "bank_partner"),
  asyncHandler(async (req, res) => {
    const garage = await garageService.getGarageByCode(req.params.uzaId);
    return success(res, { garage }, "Garage vehicle snapshot");
  }),
);

/**
 * Ingest car health + service updates from the garage.
 * Auth: X-Garage-Key: <GARAGE_API_KEY>  OR  staff Bearer token.
 *
 * Body example:
 * {
 *   "plate": "RAD123A",
 *   "model": "BYD Atto 3",
 *   "garage_name": "UZA Kigali Hub",
 *   "health": {
 *     "overall_score": 92,
 *     "battery_percent": 88,
 *     "range_km": 310,
 *     "odometer_km": 12400,
 *     "tyre_health_percent": 80,
 *     "status": "healthy",
 *     "next_service_due_km": 15000
 *   },
 *   "update": {
 *     "type": "service",
 *     "title": "Routine service completed",
 *     "detail": "Brake pads OK · software v2.1",
 *     "severity": "info"
 *   }
 * }
 */
router.post(
  "/:uzaId/updates",
  authenticateGarageOrStaff,
  asyncHandler(async (req, res) => {
    const garage = await garageService.ingestGarageUpdate(req.params.uzaId, req.body || {});
    return success(res, { garage }, "Garage update received", 201);
  }),
);

export default router;

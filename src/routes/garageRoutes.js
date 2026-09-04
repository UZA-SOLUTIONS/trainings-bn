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
 * Ingest full EV diagnosis + service updates from the garage.
 * Auth: X-Garage-Key: <GARAGE_API_KEY>  OR  staff Bearer token.
 *
 * Body example (send every field the garage can measure):
 * {
 *   "plate": "RAD123A",
 *   "vin": "LGX…",
 *   "model": "BYD Yuan Plus 2023",
 *   "garage_name": "UZA Kigali Hub",
 *   "health": {
 *     "overall_score": 92,
 *     "status": "healthy",
 *     "battery_percent": 88,
 *     "battery_soh_percent": 96,
 *     "battery_temp_c": 32,
 *     "battery_cell_diff_mv": 18,
 *     "charge_cycles": 420,
 *     "charging_status": "idle",
 *     "range_km": 310,
 *     "motor_health_percent": 94,
 *     "inverter_health_percent": 95,
 *     "coolant_temp_c": 45,
 *     "tyre_health_percent": 80,
 *     "tyre_pressure": { "fl": 2.4, "fr": 2.4, "rl": 2.5, "rr": 2.5 },
 *     "brake_health_percent": 88,
 *     "brake_pad_percent": 72,
 *     "suspension_health_percent": 90,
 *     "aux_12v_volt": 12.6,
 *     "fault_codes_count": 0,
 *     "active_warnings": [],
 *     "software_version": "v2.1.4",
 *     "odometer_km": 12400,
 *     "next_service_due_km": 15000,
 *     "last_service_at": "2026-03-01",
 *     "last_diagnosis_at": "2026-09-04",
 *     "inspection_passed": true
 *   },
 *   "update": {
 *     "type": "diagnosis",
 *     "title": "Full health check completed",
 *     "detail": "Battery SOH 96% · no DTCs · tyres OK",
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

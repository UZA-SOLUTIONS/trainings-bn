import { Router } from "express";
import * as attendanceController from "../controllers/attendanceController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import {
  updateAttendanceSessionSchema,
  upsertAttendanceRecordsSchema,
} from "../validators/attendanceValidator.js";

const router = Router();
const classroom = [authenticate, authorizeRoles("admin", "instructor")];

router.get("/sessions/:sessionId", ...classroom, attendanceController.getSession);
router.patch(
  "/sessions/:sessionId",
  ...classroom,
  validate(updateAttendanceSessionSchema),
  attendanceController.updateSession,
);
router.put(
  "/sessions/:sessionId/records",
  ...classroom,
  validate(upsertAttendanceRecordsSchema),
  attendanceController.upsertRecords,
);

export default router;

import { Router } from "express";
import * as cohortController from "../controllers/cohortController.js";
import * as attendanceController from "../controllers/attendanceController.js";
import * as assessmentController from "../controllers/assessmentController.js";
import * as issueController from "../controllers/issueController.js";
import * as reportController from "../controllers/reportController.js";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCohortSchema, updateCohortSchema } from "../validators/cohortValidator.js";
import {
  createAttendanceSessionSchema,
  listAttendanceSessionsSchema,
} from "../validators/attendanceValidator.js";
import { createAssessmentSchema } from "../validators/assessmentValidator.js";
import { createIssueSchema, listIssuesQuerySchema } from "../validators/issueValidator.js";
import { reportQuerySchema } from "../validators/reportValidator.js";

const router = Router();
const classroom = [authenticate, authorizeRoles("admin", "instructor")];

router.get("/", optionalAuthenticate, cohortController.list);
router.get("/overview", authenticate, authorizeRoles("admin", "instructor", "bank_partner"), cohortController.overview);

router.get(
  "/:id/attendance/sessions",
  ...classroom,
  validate(listAttendanceSessionsSchema, "query"),
  attendanceController.listSessions,
);
router.post(
  "/:id/attendance/sessions",
  ...classroom,
  validate(createAttendanceSessionSchema),
  attendanceController.createSession,
);
router.get("/:id/assessments", ...classroom, assessmentController.list);
router.post(
  "/:id/assessments",
  ...classroom,
  validate(createAssessmentSchema),
  assessmentController.create,
);
router.get(
  "/:id/issues",
  ...classroom,
  validate(listIssuesQuerySchema, "query"),
  issueController.listForCohort,
);
router.post(
  "/:id/issues",
  ...classroom,
  validate(createIssueSchema),
  issueController.createForCohort,
);
router.get(
  "/:id/reports/attendance",
  ...classroom,
  validate(reportQuerySchema, "query"),
  reportController.attendance,
);
router.get(
  "/:id/reports/scores",
  ...classroom,
  validate(reportQuerySchema, "query"),
  reportController.scores,
);
router.get(
  "/:id/reports/issues",
  ...classroom,
  validate(reportQuerySchema, "query"),
  reportController.issues,
);

router.get("/:id", authenticate, authorizeRoles("admin", "instructor"), cohortController.getOne);
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(createCohortSchema),
  cohortController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(updateCohortSchema),
  cohortController.update,
);
router.delete("/:id", authenticate, authorizeRoles("admin", "instructor"), cohortController.remove);

export default router;

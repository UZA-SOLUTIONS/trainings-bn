import { Router } from "express";
import * as assessmentController from "../controllers/assessmentController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import {
  updateAssessmentSchema,
  upsertAssessmentScoresSchema,
} from "../validators/assessmentValidator.js";

const router = Router();
const classroom = [authenticate, authorizeRoles("admin", "instructor")];

router.get("/:assessmentId", ...classroom, assessmentController.getOne);
router.patch(
  "/:assessmentId",
  ...classroom,
  validate(updateAssessmentSchema),
  assessmentController.update,
);
router.put(
  "/:assessmentId/scores",
  ...classroom,
  validate(upsertAssessmentScoresSchema),
  assessmentController.upsertScores,
);

export default router;

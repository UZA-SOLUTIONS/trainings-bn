import { Router } from "express";
import * as issueController from "../controllers/issueController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { updateIssueSchema } from "../validators/issueValidator.js";

const router = Router();
const classroom = [authenticate, authorizeRoles("admin", "instructor")];

router.patch(
  "/:issueId",
  ...classroom,
  validate(updateIssueSchema),
  issueController.update,
);

export default router;

import { Router } from "express";
import * as candidateController from "../controllers/candidateController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCandidateSchema, updateCandidateSchema } from "../validators/candidateValidator.js";

const router = Router();

router.post("/", validate(createCandidateSchema), candidateController.create);
router.get("/", authenticate, authorizeRoles("admin", "instructor"), candidateController.list);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(updateCandidateSchema),
  candidateController.update,
);

export default router;

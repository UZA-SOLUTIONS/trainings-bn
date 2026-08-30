import { Router } from "express";
import * as cohortController from "../controllers/cohortController.js";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCohortSchema, updateCohortSchema } from "../validators/cohortValidator.js";

const router = Router();

router.get("/", optionalAuthenticate, cohortController.list);
router.get("/overview", authenticate, cohortController.overview);
router.get("/:id", authenticate, cohortController.getOne);
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validate(createCohortSchema),
  cohortController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validate(updateCohortSchema),
  cohortController.update,
);

export default router;

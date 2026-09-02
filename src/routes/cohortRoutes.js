import { Router } from "express";
import * as cohortController from "../controllers/cohortController.js";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCohortSchema, updateCohortSchema } from "../validators/cohortValidator.js";

const router = Router();

router.get("/", optionalAuthenticate, cohortController.list);
router.get("/overview", authenticate, authorizeRoles("admin", "instructor", "bank_partner"), cohortController.overview);
router.get("/:id", authenticate, authorizeRoles("admin", "instructor"), cohortController.getOne);
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
router.delete("/:id", authenticate, authorizeRoles("admin"), cohortController.remove);

export default router;

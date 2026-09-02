import { Router } from "express";
import * as institutionController from "../controllers/institutionController.js";
import { authenticate, authorizeRoles, optionalAuthenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import {
  createInstitutionSchema,
  updateInstitutionSchema,
} from "../validators/institutionValidator.js";

const router = Router();

router.get("/", optionalAuthenticate, institutionController.list);
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  validate(createInstitutionSchema),
  institutionController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validate(updateInstitutionSchema),
  institutionController.update,
);
router.delete("/:id", authenticate, authorizeRoles("admin"), institutionController.remove);

export default router;

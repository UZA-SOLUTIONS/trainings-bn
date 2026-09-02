import { Router } from "express";
import * as moduleController from "../controllers/moduleController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createModuleSchema, updateModuleSchema } from "../validators/moduleValidator.js";

const router = Router();

router.get("/", authenticate, authorizeRoles("admin", "instructor"), moduleController.list);
router.get("/:id", authenticate, authorizeRoles("admin", "instructor"), moduleController.getOne);
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(createModuleSchema),
  moduleController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(updateModuleSchema),
  moduleController.update,
);
router.delete("/:id", authenticate, authorizeRoles("admin", "instructor"), moduleController.remove);

export default router;

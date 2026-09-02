import { Router } from "express";
import * as courseController from "../controllers/courseController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCourseSchema, updateCourseSchema } from "../validators/courseValidator.js";

const router = Router();

router.get("/", authenticate, authorizeRoles("admin", "instructor"), courseController.list);
router.get("/:id", authenticate, authorizeRoles("admin", "instructor"), courseController.getOne);
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(createCourseSchema),
  courseController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(updateCourseSchema),
  courseController.update,
);
router.delete("/:id", authenticate, authorizeRoles("admin", "instructor"), courseController.remove);

export default router;

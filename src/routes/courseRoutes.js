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
  authorizeRoles("admin"),
  validate(createCourseSchema),
  courseController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  validate(updateCourseSchema),
  courseController.update,
);

export default router;

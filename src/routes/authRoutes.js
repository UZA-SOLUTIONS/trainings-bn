import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/authController.js";
import { validate } from "../middleware/validationMiddleware.js";
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  changePasswordSchema,
  createStaffSchema,
} from "../validators/authValidator.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
    error: "RATE_LIMITED",
  },
});

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);
router.patch("/me", authenticate, validate(updateProfileSchema), authController.updateMe);
router.patch("/password", authenticate, validate(changePasswordSchema), authController.changePassword);
router.post(
  "/staff",
  authenticate,
  authorizeRoles("admin"),
  validate(createStaffSchema),
  authController.createStaff,
);
router.get("/staff", authenticate, authorizeRoles("admin"), authController.listStaff);

export default router;

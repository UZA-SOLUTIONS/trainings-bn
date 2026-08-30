import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../controllers/authController.js";
import { validate } from "../middleware/validationMiddleware.js";
import { loginSchema, registerSchema } from "../validators/authValidator.js";
import { authenticate } from "../middleware/authMiddleware.js";

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

export default router;

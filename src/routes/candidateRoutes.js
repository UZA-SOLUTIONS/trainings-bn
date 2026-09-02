import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as candidateController from "../controllers/candidateController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCandidateSchema, updateCandidateSchema } from "../validators/candidateValidator.js";

const router = Router();

const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many lookups. Try again in a few minutes.",
    error: "RATE_LIMITED",
  },
});

router.get("/track/:code", trackLimiter, candidateController.track);
router.post("/", validate(createCandidateSchema), candidateController.create);
router.get("/", authenticate, authorizeRoles("admin", "instructor"), candidateController.list);
router.patch(
  "/:id",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(updateCandidateSchema),
  candidateController.update,
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  candidateController.remove,
);

export default router;

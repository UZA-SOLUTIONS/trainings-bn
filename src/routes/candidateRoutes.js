import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import * as candidateController from "../controllers/candidateController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { createCandidateSchema, updateCandidateSchema, createIntakeRosterSchema, bulkCreateIntakeRosterSchema } from "../validators/candidateValidator.js";
import * as issueController from "../controllers/issueController.js";
import { createCandidateIssueSchema } from "../validators/issueValidator.js";

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

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
    error: "RATE_LIMITED",
  },
});

const candidateLoginSchema = z.object({
  candidate_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^UZA-\d{4}-\d{5}$/, { message: "Enter a valid candidate ID (UZA-2026-00001)" }),
});

router.get("/track/:code", trackLimiter, candidateController.track);
router.post(
  "/auth/login",
  loginLimiter,
  validate(candidateLoginSchema),
  candidateController.candidateLogin,
);
router.get("/auth/me", authenticate, authorizeRoles("candidate"), candidateController.candidateMe);
router.post("/", validate(createCandidateSchema), candidateController.create);
router.post(
  "/intake",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(createIntakeRosterSchema),
  candidateController.createIntake,
);
router.post(
  "/intake/bulk",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(bulkCreateIntakeRosterSchema),
  candidateController.bulkCreateIntake,
);
router.get("/", authenticate, authorizeRoles("admin", "instructor"), candidateController.list);
router.get(
  "/:id/issues",
  authenticate,
  authorizeRoles("admin", "instructor"),
  issueController.listForCandidate,
);
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin", "instructor"),
  candidateController.getOne,
);
router.post(
  "/:id/issues",
  authenticate,
  authorizeRoles("admin", "instructor"),
  validate(createCandidateIssueSchema),
  issueController.createForCandidate,
);
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
  authorizeRoles("admin", "instructor"),
  candidateController.remove,
);

export default router;

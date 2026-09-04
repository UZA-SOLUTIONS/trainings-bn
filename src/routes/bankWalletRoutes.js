import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

/**
 * Bank wallet portfolio endpoints — planned (OS §8).
 * Marked here so bank UI and implementers share one contract list.
 */
const router = Router();

function planned(res, endpoint) {
  return res.status(501).json({
    success: false,
    message: "Bank wallet portfolio not live yet.",
    error: "WALLET_NOT_LIVE",
    data: { planned: true, endpoint },
  });
}

router.get(
  "/applicants/:uzaId/wallet-risk",
  authenticate,
  authorizeRoles("admin", "bank_partner"),
  (req, res) => planned(res, `GET /api/bank/applicants/${req.params.uzaId}/wallet-risk`),
);

router.get(
  "/portfolio/wallet",
  authenticate,
  authorizeRoles("admin", "bank_partner"),
  (_req, res) => planned(res, "GET /api/bank/portfolio/wallet"),
);

export default router;

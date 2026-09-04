import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";
import { WALLET_ENDPOINTS } from "../services/walletPreviewService.js";
import { Candidate } from "../models/Candidate.js";
import { buildWalletPreview } from "../services/walletPreviewService.js";
import { success } from "../utils/response.js";
import { AppError } from "../utils/errors.js";

/**
 * Wallet routes — contracts marked for future MoMo / ledger work.
 * Preview (derived from training data) is available now for banks & staff.
 * Live ledger mutations return 501 until credentials are switched on.
 */
const router = Router();

const CANDIDATE_CODE_RE = /^UZA-\d{4}-\d{5}$/i;

function planned(res, endpoint) {
  return res.status(501).json({
    success: false,
    message: "Wallet ledger not live yet — MoMo credentials still to switch on.",
    error: "WALLET_NOT_LIVE",
    data: {
      planned: true,
      endpoint,
      catalogue: WALLET_ENDPOINTS,
    },
  });
}

/** Catalogue of planned wallet / bank money endpoints */
router.get("/catalogue", (_req, res) => {
  return success(res, { endpoints: WALLET_ENDPOINTS }, "Planned wallet endpoints");
});

/**
 * Bank / staff preview: how this driver will use the wallet once live.
 * GET /api/wallet/:uzaId/preview
 */
router.get(
  "/:uzaId/preview",
  authenticate,
  authorizeRoles("admin", "instructor", "bank_partner"),
  async (req, res, next) => {
    try {
      const code = String(req.params.uzaId || "").trim().toUpperCase();
      if (!CANDIDATE_CODE_RE.test(code)) {
        throw new AppError("Invalid UZA ID", 400, "INVALID_CODE");
      }
      const candidate = await Candidate.findOne({ candidate_code: code }).lean();
      if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");

      const audience =
        req.user?.role === "bank_partner" ? "bank" : req.user?.role === "admin" ? "staff" : "staff";

      return success(
        res,
        { wallet: buildWalletPreview(candidate, { audience }) },
        "Wallet preview (ledger not live)",
      );
    } catch (err) {
      next(err);
    }
  },
);

/** Live balance — not wired */
router.get("/:uzaId", authenticate, (req, res) =>
  planned(res, `GET /api/wallet/${req.params.uzaId}`),
);

router.get("/:uzaId/ledger", authenticate, (req, res) =>
  planned(res, `GET /api/wallet/${req.params.uzaId}/ledger`),
);

router.get("/:uzaId/daily", authenticate, (req, res) =>
  planned(res, `GET /api/wallet/${req.params.uzaId}/daily`),
);

router.get("/:uzaId/savings", authenticate, (req, res) =>
  planned(res, `GET /api/wallet/${req.params.uzaId}/savings`),
);

router.get("/:uzaId/loan", authenticate, (req, res) =>
  planned(res, `GET /api/wallet/${req.params.uzaId}/loan`),
);

router.post("/:uzaId/topups", authenticate, (req, res) =>
  planned(res, `POST /api/wallet/${req.params.uzaId}/topups`),
);

router.post("/:uzaId/payouts", authenticate, (req, res) =>
  planned(res, `POST /api/wallet/${req.params.uzaId}/payouts`),
);

export default router;

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getClientOrigins } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware.js";
import * as candidateController from "./controllers/candidateController.js";
import authRoutes from "./routes/authRoutes.js";
import cohortRoutes from "./routes/cohortRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import institutionRoutes from "./routes/institutionRoutes.js";
import lenderRoutes from "./routes/lenderRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import bankWalletRoutes from "./routes/bankWalletRoutes.js";
import garageRoutes from "./routes/garageRoutes.js";

/** Preview/prod hosts that should always be allowed without listing every CLIENT_URL entry. */
function isAllowedProductionOrigin(origin) {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return false;
    if (hostname.endsWith(".vercel.app")) return true;
    if (hostname === "uzamobility.com" || hostname.endsWith(".uzamobility.com")) return true;
    return false;
  } catch {
    return false;
  }
}

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

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const allowed = getClientOrigins();
        if (
          allowed.includes(origin) ||
          isAllowedProductionOrigin(origin)
        ) {
          callback(null, true);
          return;
        }

        // Reject without throwing — a thrown Error becomes HTTP 500 with no CORS headers,
        // which browsers report as a generic CORS failure.
        callback(null, false);
      },
      credentials: true,
    }),
  );
  // Larger limit so instructors can save full module content + small file uploads
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/api/health", (req, res) => {
    res.json({
      success: true,
      message: "UZA Mobility API is healthy",
      data: { status: "ok" },
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/cohorts", cohortRoutes);
  app.get("/api/candidates/track/:code", trackLimiter, candidateController.track);
  app.use("/api/candidates", candidateRoutes);
  app.use("/api/institutions", institutionRoutes);
  app.use("/api/financing/lenders", lenderRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/modules", moduleRoutes);
  app.use("/api/wallet", walletRoutes);
  app.use("/api/bank", bankWalletRoutes);
  app.use("/api/garage", garageRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

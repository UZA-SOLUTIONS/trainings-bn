import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import cohortRoutes from "./routes/cohortRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import institutionRoutes from "./routes/institutionRoutes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

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
  app.use("/api/candidates", candidateRoutes);
  app.use("/api/institutions", institutionRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/errors.js";
import { env } from "../config/env.js";

/**
 * Allow garage systems (X-Garage-Key) or staff JWT (admin / instructor).
 */
export const authenticateGarageOrStaff = asyncHandler(async (req, _res, next) => {
  const garageKey = env.GARAGE_API_KEY;
  const xKey = req.headers["x-garage-key"];
  const auth = req.headers.authorization || "";

  let providedGarageKey = null;
  if (typeof xKey === "string" && xKey.trim()) {
    providedGarageKey = xKey.trim();
  } else if (auth.startsWith("Garage ")) {
    providedGarageKey = auth.slice(7).trim();
  }

  if (garageKey && providedGarageKey && providedGarageKey === garageKey) {
    req.garage = { source: "api_key" };
    return next();
  }

  if (!auth.startsWith("Bearer ")) {
    throw new AppError(
      garageKey
        ? "Provide X-Garage-Key or a staff Bearer token"
        : "Staff authentication required (or set GARAGE_API_KEY for garage systems)",
      401,
      "UNAUTHORIZED",
    );
  }

  try {
    const payload = verifyAccessToken(auth.slice(7));
    if (!["admin", "instructor"].includes(payload.role)) {
      throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      institution_id: payload.institution_id ?? null,
    };
    return next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
});

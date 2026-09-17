import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/errors.js";
import { env } from "../config/env.js";

/**
 * Allow the institution dash (X-Catalogue-Key) or UZA staff JWT (admin / instructor).
 */
export const authenticateCatalogueOrStaff = asyncHandler(async (req, _res, next) => {
  const catalogueKey = env.CATALOGUE_SYNC_SECRET;
  const xKey = req.headers["x-catalogue-key"];
  const auth = req.headers.authorization || "";

  let providedKey = null;
  if (typeof xKey === "string" && xKey.trim()) {
    providedKey = xKey.trim();
  } else if (auth.startsWith("Catalogue ")) {
    providedKey = auth.slice(10).trim();
  }

  if (catalogueKey && providedKey && providedKey === catalogueKey) {
    req.catalogue = { source: "api_key" };
    return next();
  }

  if (!auth.startsWith("Bearer ")) {
    throw new AppError(
      catalogueKey
        ? "Provide X-Catalogue-Key or a staff Bearer token"
        : "Staff authentication required (or set CATALOGUE_SYNC_SECRET for the institution dash)",
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

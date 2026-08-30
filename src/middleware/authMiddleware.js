import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { asyncHandler } from "../utils/errors.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
  }
});

export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // ignore invalid optional token
  }
  next();
});

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Insufficient permissions", 403, "FORBIDDEN"));
    }
    next();
  };
}

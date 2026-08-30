import { env } from "../config/env.js";
import { fail } from "../utils/response.js";
import { AppError } from "../utils/errors.js";

export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  const code = err.code || "INTERNAL_ERROR";
  const isProd = env.NODE_ENV === "production";

  if (!err.isOperational) {
    console.error(err);
  }

  const message =
    status >= 500 && isProd
      ? "An unexpected error occurred"
      : err.message || "An unexpected error occurred";

  return fail(res, message, status, code);
}

export function notFoundMiddleware(req, res) {
  return fail(res, `Route ${req.method} ${req.originalUrl} not found`, 404, "NOT_FOUND");
}

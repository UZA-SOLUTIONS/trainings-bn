import { AppError } from "../utils/errors.js";

export function validate(schema, source = "body") {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Validation failed";
      return next(new AppError(message, 400, "VALIDATION_ERROR"));
    }
    req[source] = parsed.data;
    next();
  };
}

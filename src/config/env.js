import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLIENT_URL: z
    .string()
    .default("http://localhost:5173")
    .refine(
      (value) =>
        value.split(",").every((part) => {
          try {
            new URL(part.trim());
            return true;
          } catch {
            return false;
          }
        }),
      { message: "CLIENT_URL must be one or more valid URLs, comma-separated" },
    ),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("1h"),
  SEED_STAFF_PASSWORD: z.string().min(6).default("ChangeMe123!"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Comma-separated CLIENT_URL values, trimmed. */
export function getClientOrigins() {
  return env.CLIENT_URL.split(",").map((origin) => origin.trim()).filter(Boolean);
}

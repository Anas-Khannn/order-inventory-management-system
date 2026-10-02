import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  /** Web app origin, used to build password reset links. */
  APP_URL: z.string().url().optional(),
  /**
   * There is no email service yet. When true, forgot-password returns the reset link in its
   * response so the UI can open it. Defaults to on outside production, and must stay off in production.
   */
  AUTH_EXPOSE_RESET_LINK: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  APP_URL: parsed.APP_URL ?? parsed.CORS_ORIGIN,
  AUTH_EXPOSE_RESET_LINK: parsed.AUTH_EXPOSE_RESET_LINK ?? parsed.NODE_ENV !== "production",
};

import { z } from "zod";

/** Highest privilege first. ADMIN manages people, MANAGER manages the catalog, STAFF takes orders. */
export const USER_ROLE = ["ADMIN", "MANAGER", "STAFF"] as const;
export type UserRole = (typeof USER_ROLE)[number];

export const PERMISSIONS = {
  ADMIN: ["products:write", "orders:write", "orders:cancel", "users:manage"],
  MANAGER: ["products:write", "orders:write", "orders:cancel"],
  STAFF: ["orders:write"],
} as const satisfies Record<UserRole, readonly string[]>;
export type Permission = (typeof PERMISSIONS)[UserRole][number];

export const can = (role: UserRole, permission: Permission) => (PERMISSIONS[role] as readonly string[]).includes(permission);

/** Each rule is shown live as a checklist while the user types a new password. */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "case", label: "Upper and lower case letters", test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", label: "At least one number", test: (v: string) => /\d/.test(v) },
  { id: "symbol", label: "At least one symbol", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const email = z.string().trim().min(1, "Email is required").email("Enter a valid email").max(254);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(true),
});

export const forgotPasswordSchema = z.object({ email });

const newPassword = PASSWORD_RULES.reduce(
  (s, r) => s.refine(r.test, r.label),
  z.string().max(128, "Use 128 characters or fewer") as z.ZodType<string>,
);

/** What the API accepts. */
export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1, "This reset link is not valid").max(256),
  password: newPassword,
});

/** What the form validates: the request plus a confirmation field. */
export const resetPasswordSchema = resetPasswordRequestSchema
  .extend({ confirm: z.string().min(1, "Confirm your new password") })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export interface UserDto {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface SessionDto {
  user: UserDto;
  token: string;
  expiresAt: string;
}

import type { ForgotPasswordInput, LoginInput, ResetPasswordInput, SessionDto, SignupInput, UserDto, UserRole } from "@repo/shared";
import { http } from "@/lib/http";

/** FACADE: UI code never touches fetch/URLs/response shapes directly. */
export const authFacade = {
  login: async (input: LoginInput) => (await http<{ data: SessionDto }>("/auth/login", { method: "POST", body: JSON.stringify(input) })).data,
  /** Creates a Staff account and returns a signed-in session. */
  signup: async ({ name, email, password }: SignupInput) =>
    (await http<{ data: SessionDto }>("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) })).data,
  /** Uses the token already set on the http client. */
  logout: async () => {
    await http("/auth/logout", { method: "POST" });
  },
  me: async () => (await http<{ data: UserDto }>("/auth/me")).data,
  /** The server answers the same way for unknown emails. In development it also returns the link. */
  requestReset: async (input: ForgotPasswordInput) =>
    (await http<{ data: { resetUrl?: string } }>("/auth/forgot-password", { method: "POST", body: JSON.stringify(input) })).data,
  resetPassword: async ({ token, password }: ResetPasswordInput) => {
    await http("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
  },
};

export const ROLE_LABEL: Record<UserRole, string> = { ADMIN: "Admin", MANAGER: "Manager", STAFF: "Staff" };

/** The accounts `pnpm db:seed` creates. Offered on the sign-in page in development builds only. */
export const DEMO_ACCOUNTS = import.meta.env.DEV
  ? {
      password: "Demo@1234",
      users: [
        { email: "admin@store.test", role: "ADMIN", blurb: "Everything, including people" },
        { email: "manager@store.test", role: "MANAGER", blurb: "Catalog, stock and orders" },
        { email: "staff@store.test", role: "STAFF", blurb: "Create and view orders" },
      ] satisfies { email: string; role: UserRole; blurb: string }[],
    }
  : null;

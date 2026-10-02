import type { ForgotPasswordInput, LoginInput, ResetPasswordRequest, SessionDto, SignupRequest, UserDto } from "@repo/shared";
import { env } from "../../config/env";
import { db } from "../../db/client";
import { AppError, conflict, isUniqueViolation } from "../../errors";
import { DUMMY_HASH, hashPassword, hashToken, newToken, verifyPassword } from "./crypto";
import { createFailureLimiter } from "./rate-limit";
import { authRepository, type UserRow } from "./auth.repository";

const SESSION_TTL_MS = 8 * 3_600_000;
const REMEMBER_TTL_MS = 30 * 24 * 3_600_000;
const RESET_TTL_MS = 30 * 60_000;

/** 5 failed sign-ins per email and IP every 15 minutes. */
const loginLimiter = createFailureLimiter({ max: 5, windowMs: 15 * 60_000 });

/** 10 sign-ups per IP every hour, to slow down scripted account creation. */
const signupLimiter = createFailureLimiter({ max: 10, windowMs: 60 * 60_000 });

export const toUserDto = (u: UserRow): UserDto => ({ id: u.id, name: u.name, email: u.email, role: u.role });

const invalidCredentials = () => new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
export const unauthorized = () => new AppError(401, "UNAUTHORIZED", "Your session has ended. Sign in again.");

async function startSession(user: UserRow, remember: boolean): Promise<SessionDto> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + (remember ? REMEMBER_TTL_MS : SESSION_TTL_MS));
  await authRepository.insertSession(user.id, hashToken(token), expiresAt);
  return { user: toUserDto(user), token, expiresAt: expiresAt.toISOString() };
}

/**
 * FACADE: the single entry point routes and middleware use for authentication.
 * Hides hashing, token handling and rate limiting behind a small API.
 */
export const authFacade = {
  async login({ email, password, remember }: LoginInput, ip: string): Promise<SessionDto> {
    const key = `${ip}|${email.toLowerCase()}`;
    const wait = loginLimiter.retryAfter(key);
    if (wait) throw new AppError(429, "TOO_MANY_ATTEMPTS", `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minutes.`, { retryAfter: wait });

    const user = await authRepository.findUserByEmail(email);
    // Verify against a dummy hash for unknown emails, so response time does not reveal which emails exist.
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      loginLimiter.fail(key);
      throw invalidCredentials();
    }
    loginLimiter.reset(key);

    return startSession(user, remember);
  },

  /** Creates a STAFF account and signs it in straight away. */
  async signup({ name, email, password }: SignupRequest, ip: string): Promise<SessionDto> {
    const wait = signupLimiter.retryAfter(ip);
    if (wait) throw new AppError(429, "TOO_MANY_ATTEMPTS", `Too many new accounts from this network. Try again in ${Math.ceil(wait / 60)} minutes.`, { retryAfter: wait });
    signupLimiter.fail(ip);

    let user: UserRow;
    try {
      user = await authRepository.insertUser(name, email, await hashPassword(password));
    } catch (e) {
      // The unique index on lower(email) decides; no check-then-insert race.
      throw isUniqueViolation(e) ? conflict("EMAIL_TAKEN", "An account with this email already exists.", [{ path: "email", message: "This email already has an account" }]) : e;
    }
    return startSession(user, false);
  },

  async authenticate(token: string): Promise<UserDto> {
    const row = await authRepository.findSession(hashToken(token));
    if (!row) throw unauthorized();
    return toUserDto(row.user);
  },

  async logout(token: string) {
    await authRepository.deleteSession(hashToken(token));
  },

  /** Same answer whether or not the email has an account. */
  async requestReset({ email }: ForgotPasswordInput): Promise<{ resetUrl?: string }> {
    const user = await authRepository.findUserByEmail(email);
    if (!user) return {};
    const token = newToken();
    await authRepository.insertReset(user.id, hashToken(token), new Date(Date.now() + RESET_TTL_MS));
    const resetUrl = `${env.APP_URL}/#/reset-password?token=${token}`;
    if (!env.AUTH_EXPOSE_RESET_LINK) {
      // TODO: send `resetUrl` by email once a mail provider is configured.
      return {};
    }
    console.info(`[auth] Password reset link for ${user.email}: ${resetUrl}`);
    return { resetUrl };
  },

  async resetPassword({ token, password }: ResetPasswordRequest) {
    // Hash before the transaction so the row lock is held for milliseconds, not the scrypt time.
    const passwordHash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const reset = await authRepository.findUsableResetForUpdate(tx, hashToken(token));
      if (!reset) throw new AppError(400, "INVALID_TOKEN", "This reset link has expired or was already used. Ask for a new one.");
      await authRepository.completeReset(tx, reset.userId, passwordHash);
    });
  },

  purgeExpired: () => authRepository.purgeExpired(),
};

import { can, type Permission, type UserDto } from "@repo/shared";
import type { Request, RequestHandler } from "express";
import { AppError } from "../errors";
import { authFacade, unauthorized } from "../modules/auth/auth.facade";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. */
      auth?: { user: UserDto; token: string };
    }
  }
}

export const bearerToken = (req: Request) => {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "");
  return match?.[1];
};

/** Rejects the request with 401 unless it carries a live session token. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) throw unauthorized();
  req.auth = { user: await authFacade.authenticate(token), token };
  next();
};

/** Rejects with 403 unless the signed-in role has the permission. Use after `requireAuth`. */
export const requirePermission =
  (permission: Permission): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) throw unauthorized();
    if (!can(req.auth.user.role, permission)) throw new AppError(403, "FORBIDDEN", "Your role does not allow this action.");
    next();
  };

import { Router } from "express";
import { forgotPasswordSchema, loginSchema, resetPasswordRequestSchema } from "@repo/shared";
import { requireAuth } from "../../middleware/auth";
import { authFacade } from "./auth.facade";

export const authRoutes = Router();

authRoutes.post("/login", async (req, res) => {
  res.json({ data: await authFacade.login(loginSchema.parse(req.body), req.ip ?? "unknown") });
});

authRoutes.post("/logout", requireAuth, async (req, res) => {
  await authFacade.logout(req.auth!.token);
  res.status(204).end();
});

authRoutes.get("/me", requireAuth, (req, res) => {
  res.json({ data: req.auth!.user });
});

/** Always 202, so the response does not reveal which emails have accounts. */
authRoutes.post("/forgot-password", async (req, res) => {
  res.status(202).json({ data: await authFacade.requestReset(forgotPasswordSchema.parse(req.body)) });
});

authRoutes.post("/reset-password", async (req, res) => {
  await authFacade.resetPassword(resetPasswordRequestSchema.parse(req.body));
  res.status(204).end();
});

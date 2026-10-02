import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, hashToken, newToken, verifyPassword } from "./crypto";
import { createFailureLimiter } from "./rate-limit";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const stored = await hashPassword("Strong#1x");
    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(await verifyPassword("Strong#1x", stored)).toBe(true);
    expect(await verifyPassword("Strong#1y", stored)).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects a stored value in an unknown format", async () => {
    expect(await verifyPassword("x", "bcrypt$whatever")).toBe(false);
  });
});

describe("tokens", () => {
  it("makes unique 256-bit tokens and stores only a hex SHA-256", () => {
    const a = newToken();
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(newToken()).not.toBe(a);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).toBe(hashToken(a));
  });
});

describe("failure limiter", () => {
  it("blocks after max failures until the window ends, and reset clears it", () => {
    const limiter = createFailureLimiter({ max: 2, windowMs: 60_000 });
    const t0 = 1_000_000;
    limiter.fail("k", t0);
    expect(limiter.retryAfter("k", t0)).toBe(0);
    limiter.fail("k", t0);
    expect(limiter.retryAfter("k", t0 + 1_000)).toBe(59);
    expect(limiter.retryAfter("k", t0 + 60_000)).toBe(0);
    limiter.fail("k", t0 + 60_000);
    limiter.fail("k", t0 + 60_000);
    limiter.reset("k");
    expect(limiter.retryAfter("k", t0 + 60_000)).toBe(0);
  });
});

// Route guards answer before any database call, so these run without Postgres.
describe("route protection", () => {
  let base = "";
  let close = () => {};

  beforeAll(async () => {
    process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/test";
    const { app } = await import("../../app");
    const server = app.listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
    close = () => server.close();
  });
  afterAll(() => close());

  it.each([
    ["GET", "/products"],
    ["POST", "/products"],
    ["GET", "/orders"],
    ["POST", "/orders/1/cancel"],
    ["GET", "/auth/me"],
    ["POST", "/auth/logout"],
  ])("%s %s without a token answers 401", async (method, path) => {
    const res = await fetch(base + path, { method });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("UNAUTHORIZED");
  });

  it("keeps the health check public", async () => {
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });

  it("validates login input before touching the database", async () => {
    const res = await fetch(`${base}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "x" }) });
    expect(res.status).toBe(400);
  });

  it("validates sign-up input before touching the database", async () => {
    const res = await fetch(`${base}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email: "bad", password: "weak" }),
    });
    expect(res.status).toBe(400);
    const paths = ((await res.json()) as { error: { details: { path: string }[] } }).error.details.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("rejects a weak new password", async () => {
    const res = await fetch(`${base}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "t", password: "weak" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("requirePermission", () => {
  it("allows a permitted role and answers 403 for others", async () => {
    process.env.DATABASE_URL ??= "postgres://test:test@127.0.0.1:1/test";
    const { requirePermission } = await import("../../middleware/auth");
    const guard = requirePermission("products:write");
    const run = (role: "ADMIN" | "MANAGER" | "STAFF") => {
      let passed = false;
      const req = { auth: { token: "t", user: { id: 1, name: "n", email: "e", role } } };
      try {
        guard(req as never, {} as never, () => (passed = true));
      } catch (e) {
        return (e as { status: number }).status;
      }
      return passed ? 200 : 0;
    };
    expect(run("ADMIN")).toBe(200);
    expect(run("MANAGER")).toBe(200);
    expect(run("STAFF")).toBe(403);
  });
});

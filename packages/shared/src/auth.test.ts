import { describe, expect, it } from "vitest";
import { can, loginSchema, resetPasswordSchema } from "./auth";

describe("loginSchema", () => {
  it("trims the email and defaults remember to true", () => {
    expect(loginSchema.parse({ email: "  a@b.co ", password: "x" })).toEqual({ email: "a@b.co", password: "x", remember: true });
  });
  it("rejects a bad email and an empty password", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(["email", "password"]);
  });
});

describe("resetPasswordSchema", () => {
  const ok = { token: "t", password: "Strong#1x", confirm: "Strong#1x" };
  it("accepts a password that meets every rule", () => {
    expect(resetPasswordSchema.safeParse(ok).success).toBe(true);
  });
  it.each([
    ["short", "Ab#1"],
    ["no upper case", "strong#1x"],
    ["no number", "Strong#xx"],
    ["no symbol", "Strong1xx"],
  ])("rejects a password with %s", (_case, password) => {
    expect(resetPasswordSchema.safeParse({ ...ok, password, confirm: password }).success).toBe(false);
  });
  it("puts a mismatch error on confirm", () => {
    const r = resetPasswordSchema.safeParse({ ...ok, confirm: "Other#1xx" });
    expect(r.error?.issues).toEqual([expect.objectContaining({ path: ["confirm"], message: "Passwords do not match" })]);
  });
});

describe("can", () => {
  it("gives each role only its permissions", () => {
    expect(can("ADMIN", "users:manage")).toBe(true);
    expect(can("MANAGER", "users:manage")).toBe(false);
    expect(can("MANAGER", "products:write")).toBe(true);
    expect(can("STAFF", "products:write")).toBe(false);
    expect(can("STAFF", "orders:cancel")).toBe(false);
    expect(can("STAFF", "orders:write")).toBe(true);
  });
});

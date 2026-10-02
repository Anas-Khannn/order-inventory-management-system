import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * scrypt from Node's standard library: memory-hard, no native add-on to install.
 * Stored as `scrypt$N$r$p$salt$hash` so the cost can be raised later without breaking old hashes.
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
// N * r * 128 bytes = 32 MiB; give scrypt headroom above that.
const MAX_MEM = 64 * 1024 * 1024;

const derive = (password: string, salt: Buffer, opts: ScryptOptions, keyLength: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password.normalize("NFKC"), salt, keyLength, opts, (err, key) => (err ? reject(err) : resolve(key))));

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P, maxmem: MAX_MEM }, KEY_LENGTH);
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await derive(password, Buffer.from(salt, "base64url"), { N: Number(n), r: Number(r), p: Number(p), maxmem: MAX_MEM }, expected.length);
  return timingSafeEqual(key, expected);
}

/** A hash to verify against when the email is unknown, so both paths take the same time. */
export const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"));

/** 256-bit random token for the client, and the SHA-256 we keep in the database. */
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

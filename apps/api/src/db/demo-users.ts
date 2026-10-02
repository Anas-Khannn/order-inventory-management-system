import { hashPassword } from "../modules/auth/crypto";
import { db } from "./client";
import { users } from "./schema";

/** Development accounts, one for each role. The web sign-in page offers these in dev builds. */
export const DEMO_PASSWORD = "Demo@1234";
const demoUsers: Omit<typeof users.$inferInsert, "passwordHash">[] = [
  { name: "Ayesha Malik", email: "admin@store.test", role: "ADMIN" },
  { name: "Bilal Ahmed", email: "manager@store.test", role: "MANAGER" },
  { name: "Sara Khan", email: "staff@store.test", role: "STAFF" },
];

/** Inserts the demo accounts and skips any that already exist. Returns how many were added. */
export async function seedDemoUsers() {
  // One hash per user, so each row gets its own salt.
  const values = await Promise.all(demoUsers.map(async (u) => ({ ...u, passwordHash: await hashPassword(DEMO_PASSWORD) })));
  const inserted = await db.insert(users).values(values).onConflictDoNothing().returning({ id: users.id });
  return inserted.length;
}

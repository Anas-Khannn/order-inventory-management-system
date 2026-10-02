import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db, type Tx } from "../../db/client";
import { passwordResets, sessions, users } from "../../db/schema";

export type UserRow = typeof users.$inferSelect;

/** Repository = data access only. No business rules here. */
export const authRepository = {
  async findUserByEmail(email: string) {
    const [row] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email.toLowerCase())).limit(1);
    return row;
  },

  /** New accounts are always STAFF; only an admin may raise a role later. */
  async insertUser(name: string, email: string, passwordHash: string) {
    const [row] = await db.insert(users).values({ name, email: email.toLowerCase(), passwordHash, role: "STAFF" }).returning();
    return row!;
  },

  async insertSession(userId: number, tokenHash: string, expiresAt: Date) {
    await db.insert(sessions).values({ userId, tokenHash, expiresAt });
  },

  /** The live session for a token hash, with its user. */
  async findSession(tokenHash: string) {
    const [row] = await db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return row;
  },

  async deleteSession(tokenHash: string) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  },

  async insertReset(userId: number, tokenHash: string, expiresAt: Date) {
    await db.insert(passwordResets).values({ userId, tokenHash, expiresAt });
  },

  /** Locks the reset row so two requests with the same link cannot both succeed. */
  async findUsableResetForUpdate(tx: Tx, tokenHash: string) {
    const [row] = await tx
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, tokenHash), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
      .for("update")
      .limit(1);
    return row;
  },

  /** New password, every reset link used, and every session ended, in one transaction. */
  async completeReset(tx: Tx, userId: number, passwordHash: string) {
    const now = new Date();
    await tx.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, userId));
    await tx.update(passwordResets).set({ usedAt: now }).where(and(eq(passwordResets.userId, userId), isNull(passwordResets.usedAt)));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  },

  /** Removes rows nobody can use any more. */
  async purgeExpired() {
    const now = new Date();
    await db.delete(sessions).where(lt(sessions.expiresAt, now));
    await db.delete(passwordResets).where(or(lt(passwordResets.expiresAt, now), sql`${passwordResets.usedAt} is not null`));
  },
};

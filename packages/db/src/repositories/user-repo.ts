import { eq } from "drizzle-orm";

import type { Database } from "../context";
import { type NewUser, type User, user } from "../schema/user";

export interface UpsertFromCognitoInput {
  readonly cognitoSub: string;
  readonly email: string;
  readonly name: string;
}

export const userRepo = {
  async findById(db: Database, id: string): Promise<User | null> {
    const rows = await db.select().from(user).where(eq(user.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByCognitoSub(db: Database, cognitoSub: string): Promise<User | null> {
    const rows = await db.select().from(user).where(eq(user.cognitoSub, cognitoSub)).limit(1);
    return rows[0] ?? null;
  },

  /**
   * Email lookup is case-insensitive: the column is `citext`. Used by invite
   * flows to decide whether to attach a pending invite to an existing user
   * vs require sign-up first.
   */
  async findByEmail(db: Database, email: string): Promise<User | null> {
    const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
    return rows[0] ?? null;
  },

  /**
   * Mirrors a Cognito user into our `user` table. Idempotent: returns the
   * existing row if the cognito_sub already exists, otherwise inserts.
   * Updates email/name on conflict so a user changing them in Cognito
   * is reflected here on next sign-in.
   *
   * No WorkspaceContext — runs before the user has a workspace.
   */
  async upsertFromCognito(db: Database, input: UpsertFromCognitoInput): Promise<User> {
    const insertable: NewUser = {
      cognitoSub: input.cognitoSub,
      email: input.email,
      name: input.name,
    };
    const [row] = await db
      .insert(user)
      .values(insertable)
      .onConflictDoUpdate({
        target: user.cognitoSub,
        set: { email: input.email, name: input.name },
      })
      .returning();
    if (!row) {
      throw new Error("Failed to upsert user from Cognito");
    }
    return row;
  },
};

import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "./_core/trpc";
import { banks } from "../drizzle/schema";
import { getDb } from "./db";

export const bankRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({ name: banks.name })
      .from(banks)
      .where(eq(banks.userId, ctx.user.id))
      .orderBy(banks.name);
    return rows.map((r) => r.name);
  }),
});

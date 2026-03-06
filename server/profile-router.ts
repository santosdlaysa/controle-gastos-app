import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "./_core/trpc";
import { upsertUser, getDb } from "./db";
import { users, expenses, incomes, budgets, categoryBudgets, uberEarnings } from "../drizzle/schema";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

export const profileRouter = router({
  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80).trim() }))
    .mutation(async ({ ctx, input }) => {
      await upsertUser({ openId: ctx.user.openId, name: input.name });
      return { name: input.name };
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados não disponível.");

      const userId = ctx.user.id;

      // Delete all user data in dependency order
      await db.delete(expenses).where(eq(expenses.userId, userId));
      await db.delete(incomes).where(eq(incomes.userId, userId));
      await db.delete(budgets).where(eq(budgets.userId, userId));
      await db.delete(categoryBudgets).where(eq(categoryBudgets.userId, userId));
      await db.delete(uberEarnings).where(eq(uberEarnings.userId, userId));
      await db.delete(users).where(eq(users.id, userId));

      // Clear session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      return { success: true };
    }),
});

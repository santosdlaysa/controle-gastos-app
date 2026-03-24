import { eq, and, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { debtors } from "../drizzle/schema";
import { getDb } from "./db";

export const debtorRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(debtors)
      .where(eq(debtors.userId, ctx.user.id))
      .orderBy(asc(debtors.name));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).trim(),
      totalOwed: z.number().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select({ id: debtors.id })
        .from(debtors)
        .where(and(eq(debtors.userId, ctx.user.id), eq(debtors.name, input.name)))
        .limit(1);
      if (existing.length > 0) throw new Error("Devedor já cadastrado");
      const rows = await db
        .insert(debtors)
        .values({
          userId: ctx.user.id,
          name: input.name,
          totalOwed: input.totalOwed.toFixed(2),
        })
        .returning();
      return rows[0];
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(100).trim().optional(),
      amount: z.number().min(0).optional(),
      mode: z.enum(["add", "subtract", "set", "rename"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const set: Record<string, any> = { updatedAt: sql`now()` };
      if (input.name !== undefined) set.name = input.name;
      if (input.mode !== "rename") {
        const rows = await db
          .select({ id: debtors.id, totalOwed: debtors.totalOwed })
          .from(debtors)
          .where(and(eq(debtors.id, input.id), eq(debtors.userId, ctx.user.id)))
          .limit(1);
        if (rows.length === 0) throw new Error("Devedor não encontrado");
        const current = parseFloat(String(rows[0].totalOwed));
        const amount = input.amount ?? 0;
        let newTotal: number;
        if (input.mode === "add") {
          newTotal = current + amount;
        } else if (input.mode === "subtract") {
          newTotal = Math.max(0, current - amount);
        } else {
          newTotal = amount;
        }
        set.totalOwed = newTotal.toFixed(2);
      }
      await db.update(debtors).set(set).where(and(eq(debtors.id, input.id), eq(debtors.userId, ctx.user.id)));
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(debtors)
        .where(and(eq(debtors.id, input.id), eq(debtors.userId, ctx.user.id)));
      return { ok: true };
    }),
});

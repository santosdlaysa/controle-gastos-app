import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { banks } from "../drizzle/schema";
import { getDb } from "./db";

export const bankRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({ id: banks.id, name: banks.name, creditLimit: banks.creditLimit, debitBalance: banks.debitBalance })
      .from(banks)
      .where(eq(banks.userId, ctx.user.id))
      .orderBy(banks.name);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100).trim() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db
        .select({ id: banks.id })
        .from(banks)
        .where(and(eq(banks.userId, ctx.user.id), eq(banks.name, input.name)))
        .limit(1);
      if (existing.length > 0) throw new Error("Banco já cadastrado");
      const rows = await db
        .insert(banks)
        .values({ userId: ctx.user.id, name: input.name })
        .returning({ id: banks.id, name: banks.name, creditLimit: banks.creditLimit, debitBalance: banks.debitBalance });
      return rows[0];
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db
        .delete(banks)
        .where(and(eq(banks.id, input.id), eq(banks.userId, ctx.user.id)));
      return { ok: true };
    }),

  updateLimits: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      creditLimit: z.number().min(0).nullable().optional(),
      debitBalance: z.number().min(0).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const set: Record<string, any> = {};
      if (input.creditLimit !== undefined) set.creditLimit = input.creditLimit?.toFixed(2) ?? null;
      if (input.debitBalance !== undefined) set.debitBalance = input.debitBalance?.toFixed(2) ?? null;
      await db.update(banks).set(set).where(and(eq(banks.id, input.id), eq(banks.userId, ctx.user.id)));
      return { ok: true };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({ id: banks.id, name: banks.name, creditLimit: banks.creditLimit, debitBalance: banks.debitBalance })
        .from(banks)
        .where(eq(banks.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),
});

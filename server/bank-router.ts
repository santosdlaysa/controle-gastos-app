import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { banks } from "../drizzle/schema";
import { getDb } from "./db";

export const bankRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({ id: banks.id, name: banks.name, isCredit: banks.isCredit, creditLimit: banks.creditLimit, debitBalance: banks.debitBalance, position: banks.position })
      .from(banks)
      .where(eq(banks.userId, ctx.user.id))
      .orderBy(asc(banks.position), asc(banks.name));
  }),

  reorder: protectedProcedure
    .input(z.array(z.object({ id: z.number().int().positive(), position: z.number().int() })))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await Promise.all(
        input.map(({ id, position }) =>
          db.update(banks).set({ position }).where(and(eq(banks.id, id), eq(banks.userId, ctx.user.id)))
        )
      );
      return { ok: true };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).trim(),
      isCredit: z.boolean().optional(),
      creditLimit: z.number().min(0).nullable().optional(),
      debitBalance: z.number().nullable().optional(),
    }))
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
        .values({
          userId: ctx.user.id,
          name: input.name,
          isCredit: input.isCredit ?? false,
          creditLimit: input.creditLimit != null ? input.creditLimit.toFixed(2) : null,
          debitBalance: input.debitBalance != null ? input.debitBalance.toFixed(2) : null,
        })
        .returning({ id: banks.id, name: banks.name, isCredit: banks.isCredit, creditLimit: banks.creditLimit, debitBalance: banks.debitBalance });
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
      isCredit: z.boolean().optional(),
      creditLimit: z.number().min(0).nullable().optional(),
      debitBalance: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const set: Record<string, any> = {};
      if (input.isCredit !== undefined) set.isCredit = input.isCredit;
      if (input.creditLimit !== undefined) set.creditLimit = input.creditLimit?.toFixed(2) ?? null;
      if (input.debitBalance !== undefined) set.debitBalance = input.debitBalance?.toFixed(2) ?? null;
      await db.update(banks).set(set).where(and(eq(banks.id, input.id), eq(banks.userId, ctx.user.id)));
      return { ok: true };
    }),

  transfer: protectedProcedure
    .input(z.object({
      fromId: z.number().int().positive(),
      toId: z.number().int().positive(),
      amount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db
        .select({ id: banks.id, debitBalance: banks.debitBalance })
        .from(banks)
        .where(and(eq(banks.userId, ctx.user.id)));
      const from = rows.find(r => r.id === input.fromId);
      const to = rows.find(r => r.id === input.toId);
      if (!from || !to) throw new Error("Conta não encontrada");
      const fromBalance = from.debitBalance != null ? parseFloat(String(from.debitBalance)) : 0;
      const toBalance = to.debitBalance != null ? parseFloat(String(to.debitBalance)) : 0;
      await db.update(banks).set({ debitBalance: (fromBalance - input.amount).toFixed(2) })
        .where(and(eq(banks.id, input.fromId), eq(banks.userId, ctx.user.id)));
      await db.update(banks).set({ debitBalance: (toBalance + input.amount).toFixed(2) })
        .where(and(eq(banks.id, input.toId), eq(banks.userId, ctx.user.id)));
      return { ok: true };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({ id: banks.id, name: banks.name, isCredit: banks.isCredit, creditLimit: banks.creditLimit, debitBalance: banks.debitBalance })
        .from(banks)
        .where(eq(banks.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),
});

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getExpensesByMonth,
  getExpensesByYear,
  getExpensesByBank,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkCreateExpenses,
} from "./expense-db";
import { EXPENSE_CATEGORIES, banks } from "../drizzle/schema";
import { getDb } from "./db";

async function upsertBank(userId: number, name: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(banks)
    .values({ userId, name })
    .onConflictDoNothing();
}

const categoryEnum = z.enum(EXPENSE_CATEGORIES);
const sourceEnum = z.enum(["manual", "pluggy", "nubank"]);
const paymentTypeEnum = z.enum(["debit", "credit"]);

export const expenseRouter = router({
  getByMonth: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      return getExpensesByMonth(ctx.user.id, input.month);
    }),

  getByYear: protectedProcedure
    .input(z.object({ year: z.string().regex(/^\d{4}$/) }))
    .query(async ({ ctx, input }) => {
      return getExpensesByYear(ctx.user.id, input.year);
    }),

  getByBank: protectedProcedure
    .input(z.object({
      bankName: z.string().min(1),
      paymentType: paymentTypeEnum.optional(),
    }))
    .query(async ({ ctx, input }) => {
      return getExpensesByBank(ctx.user.id, input.bankName, input.paymentType);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: categoryEnum,
        value: z.number().positive(),
        date: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
        quantity: z.string().optional(),
        paid: z.boolean().optional(),
        source: sourceEnum.optional(),
        clientId: z.string().optional(),
        bank: z.string().max(100).optional(),
        paymentType: paymentTypeEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.bank) await upsertBank(ctx.user.id, input.bank);
      const id = await createExpense({
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        value: input.value.toFixed(2),
        date: input.date,
        month: input.month,
        quantity: input.quantity ?? null,
        paid: input.paid ?? false,
        source: input.source ?? "manual",
        clientId: input.clientId ?? null,
        bank: input.bank ?? null,
        paymentType: input.paymentType ?? null,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        category: categoryEnum.optional(),
        value: z.number().positive().optional(),
        quantity: z.string().nullable().optional(),
        paid: z.boolean().optional(),
        bank: z.string().max(100).nullable().optional(),
        paymentType: paymentTypeEnum.nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      if (updates.bank) await upsertBank(ctx.user.id, updates.bank);
      const data: Parameters<typeof updateExpense>[2] = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.category !== undefined) data.category = updates.category;
      if (updates.value !== undefined) data.value = updates.value.toFixed(2);
      if (updates.quantity !== undefined) data.quantity = updates.quantity;
      if (updates.paid !== undefined) data.paid = updates.paid;
      if (updates.bank !== undefined) data.bank = updates.bank;
      if (updates.paymentType !== undefined) data.paymentType = updates.paymentType;
      await updateExpense(ctx.user.id, id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteExpense(ctx.user.id, input.id);
      return { success: true };
    }),

  bulkCreate: protectedProcedure
    .input(
      z.object({
        expenses: z.array(
          z.object({
            name: z.string().min(1),
            category: categoryEnum,
            value: z.number().positive(),
            date: z.string(),
            month: z.string().regex(/^\d{4}-\d{2}$/),
            quantity: z.string().optional(),
            paid: z.boolean().optional(),
            source: sourceEnum.optional(),
            clientId: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await bulkCreateExpenses(
        input.expenses.map((e) => ({
          userId: ctx.user.id,
          name: e.name,
          category: e.category,
          value: e.value.toFixed(2),
          date: e.date,
          month: e.month,
          quantity: e.quantity ?? null,
          paid: e.paid ?? false,
          source: e.source ?? "manual",
          clientId: e.clientId ?? null,
        })),
      );
      return { success: true };
    }),
});

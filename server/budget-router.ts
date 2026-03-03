import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getBudget,
  upsertBudget,
  upsertIncomeOverride,
  getCategoryBudgets,
  upsertCategoryBudgets,
} from "./expense-db";
import { EXPENSE_CATEGORIES } from "../drizzle/schema";

const categoryEnum = z.enum(EXPENSE_CATEGORIES);

export const budgetRouter = router({
  get: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const [budget, catBudgets] = await Promise.all([
        getBudget(ctx.user.id, input.month),
        getCategoryBudgets(ctx.user.id, input.month),
      ]);
      return { budget, categoryBudgets: catBudgets };
    }),

  updateTotal: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        totalBudget: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertBudget(ctx.user.id, input.month, input.totalBudget.toFixed(2));
      return { success: true };
    }),

  updateIncomeOverride: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        incomeOverride: z.number().min(0).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertIncomeOverride(
        ctx.user.id,
        input.month,
        input.incomeOverride !== null ? input.incomeOverride.toFixed(2) : null,
      );
      return { success: true };
    }),

  updateCategories: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        budgets: z.array(
          z.object({
            category: categoryEnum,
            amount: z.number().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertCategoryBudgets(
        ctx.user.id,
        input.month,
        input.budgets.map((b) => ({ category: b.category, amount: b.amount.toFixed(2) })),
      );
      return { success: true };
    }),
});

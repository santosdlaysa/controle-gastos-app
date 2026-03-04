import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { bulkCreateExpenses, upsertIncome, upsertBudget, upsertCategoryBudgets, countExpenses } from "./expense-db";
import { runRawSql } from "./db";
import { EXPENSE_CATEGORIES } from "../drizzle/schema";

const categoryEnum = z.enum(EXPENSE_CATEGORIES);

const expenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: categoryEnum,
  value: z.number(),
  date: z.string(),
  month: z.string(),
  quantity: z.string().optional().nullable(),
  paid: z.boolean().optional(),
});

const monthlyDataSchema = z.object({
  month: z.string(),
  expenses: z.array(expenseSchema),
  budget: z.number().optional().nullable(),
  categoryBudgets: z.record(categoryEnum, z.number()).optional().nullable(),
});

export const migrationRouter = router({
  applyMigrations: protectedProcedure.mutation(async () => {
    await runRawSql(
      `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS "incomeOverride" numeric(10,2)`,
    );
    await runRawSql(`
      CREATE TABLE IF NOT EXISTS uber_earnings (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "userId" integer NOT NULL,
        description varchar(255) NOT NULL,
        category varchar(50) NOT NULL,
        "entryType" varchar(10) NOT NULL DEFAULT 'ganho',
        value numeric(10,2) NOT NULL,
        date varchar(30) NOT NULL,
        month varchar(7) NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      )
    `);
    await runRawSql(
      `ALTER TABLE uber_earnings ADD COLUMN IF NOT EXISTS "entryType" varchar(10) NOT NULL DEFAULT 'ganho'`,
    );
    return { success: true };
  }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const expenseCount = await countExpenses(ctx.user.id);
    return {
      hasMigrated: expenseCount > 0,
      expenseCount,
    };
  }),

  importAll: protectedProcedure
    .input(
      z.object({
        income: z
          .object({
            salary: z.number(),
            vale: z.number(),
            other: z.number(),
          })
          .optional()
          .nullable(),
        months: z.record(z.string(), monthlyDataSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Import income
      if (input.income) {
        await upsertIncome(userId, {
          salary: input.income.salary.toFixed(2),
          vale: input.income.vale.toFixed(2),
          other: input.income.other.toFixed(2),
        });
      }

      // Import each month's data
      const monthEntries = Object.values(input.months);
      let totalExpenses = 0;

      for (const monthData of monthEntries) {
        // Import budget
        if (monthData.budget != null && monthData.budget > 0) {
          await upsertBudget(userId, monthData.month, monthData.budget.toFixed(2));
        }

        // Import category budgets
        if (monthData.categoryBudgets) {
          const catItems = Object.entries(monthData.categoryBudgets)
            .filter(([, amount]) => amount > 0)
            .map(([category, amount]) => ({
              category: category as z.infer<typeof categoryEnum>,
              amount: amount.toFixed(2),
            }));
          if (catItems.length > 0) {
            await upsertCategoryBudgets(userId, monthData.month, catItems);
          }
        }

        // Import expenses (clientId = original id for dedup)
        if (monthData.expenses.length > 0) {
          await bulkCreateExpenses(
            monthData.expenses.map((e) => ({
              userId,
              clientId: e.id,
              name: e.name,
              category: e.category,
              value: e.value.toFixed(2),
              date: e.date,
              month: e.month,
              quantity: e.quantity ?? null,
              paid: e.paid ?? false,
              source: "manual" as const,
            })),
          );
          totalExpenses += monthData.expenses.length;
        }
      }

      return {
        success: true,
        importedExpenses: totalExpenses,
        importedMonths: monthEntries.length,
      };
    }),
});

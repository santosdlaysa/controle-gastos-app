import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { createConnectToken, getAccounts, getTransactions } from "./pluggy";
import { bulkCreateExpenses } from "./expense-db";
import type { PluggySyncedExpense } from "../types/pluggy";

const PLUGGY_CATEGORY_MAP: Record<string, string> = {
  "food and groceries": "alimentacao",
  food: "alimentacao",
  groceries: "alimentacao",
  restaurants: "alimentacao",
  "eating out": "alimentacao",
  transportation: "transporte",
  transport: "transporte",
  travel: "transporte",
  gas: "transporte",
  health: "saude",
  "health and fitness": "saude",
  pharmacy: "saude",
  education: "educacao",
  entertainment: "lazer",
  recreation: "lazer",
  streaming: "lazer",
  housing: "moradia",
  rent: "moradia",
  utilities: "moradia",
  home: "moradia",
  alimentação: "alimentacao",
  supermercado: "alimentacao",
  restaurante: "alimentacao",
  transporte: "transporte",
  saúde: "saude",
  educação: "educacao",
  lazer: "lazer",
  moradia: "moradia",
};

type ExpenseCategory =
  | "transporte"
  | "alimentacao"
  | "moradia"
  | "saude"
  | "educacao"
  | "lazer"
  | "outro";

function mapPluggyCategory(pluggyCategory: string | null): ExpenseCategory {
  if (!pluggyCategory) return "outro";
  const lower = pluggyCategory.toLowerCase().trim();
  if (PLUGGY_CATEGORY_MAP[lower]) return PLUGGY_CATEGORY_MAP[lower] as ExpenseCategory;
  for (const [key, category] of Object.entries(PLUGGY_CATEGORY_MAP)) {
    if (lower.includes(key)) return category as ExpenseCategory;
  }
  return "outro";
}

export const pluggyRouter = router({
  createConnectToken: protectedProcedure
    .input(z.object({ itemId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const accessToken = await createConnectToken(input.itemId);
      return { accessToken };
    }),

  syncTransactions: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const accounts = await getAccounts(input.itemId);
      const allExpenses: PluggySyncedExpense[] = [];

      for (const account of accounts) {
        const transactions = await getTransactions(account.id, input.from, input.to);
        const debits = transactions
          .filter((t) => t.type === "DEBIT" && t.amount > 0)
          .map((t) => ({
            pluggyId: t.id,
            description: t.merchant?.name || t.description,
            amount: t.amount,
            date: t.date,
            pluggyCategory: t.category,
          }));
        allExpenses.push(...debits);
      }

      return {
        expenses: allExpenses,
        totalFetched: allExpenses.length,
      };
    }),

  syncAndSave: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        from: z.string(),
        to: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accounts = await getAccounts(input.itemId);
      const toInsert: Parameters<typeof bulkCreateExpenses>[0] = [];

      for (const account of accounts) {
        const transactions = await getTransactions(account.id, input.from, input.to);
        for (const t of transactions) {
          if (t.type !== "DEBIT" || t.amount <= 0) continue;

          const date = new Date(t.date);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          const category = mapPluggyCategory(t.category);

          toInsert.push({
            userId: ctx.user.id,
            clientId: `pluggy_${t.id}`,
            name: t.merchant?.name || t.description,
            category,
            value: Math.abs(t.amount).toFixed(2),
            date: t.date,
            month,
            quantity: null,
            paid: false,
            source: "pluggy",
          });
        }
      }

      await bulkCreateExpenses(toInsert);

      return {
        added: toInsert.length,
        totalFetched: toInsert.length,
      };
    }),
});

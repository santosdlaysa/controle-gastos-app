import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';
import {
  createConnectToken,
  getAccounts,
  getTransactions,
} from './pluggy';
import type { PluggySyncedExpense } from '../types/pluggy';

export const pluggyRouter = router({
  createConnectToken: publicProcedure
    .input(z.object({ itemId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const accessToken = await createConnectToken(input.itemId);
      return { accessToken };
    }),

  syncTransactions: publicProcedure
    .input(z.object({
      itemId: z.string(),
      from: z.string(),
      to: z.string(),
    }))
    .mutation(async ({ input }) => {
      const accounts = await getAccounts(input.itemId);

      const allExpenses: PluggySyncedExpense[] = [];

      for (const account of accounts) {
        const transactions = await getTransactions(
          account.id,
          input.from,
          input.to
        );

        const debits = transactions
          .filter(t => t.type === 'DEBIT' && t.amount > 0)
          .map(t => ({
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
});

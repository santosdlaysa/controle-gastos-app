import { router, protectedProcedure } from "./_core/trpc";
import { getMonthlyHistory, getIncome } from "./expense-db";

export const historyRouter = router({
  getSummaries: protectedProcedure.query(async ({ ctx }) => {
    const [monthlyData, income] = await Promise.all([
      getMonthlyHistory(ctx.user.id),
      getIncome(ctx.user.id),
    ]);
    return { monthlyData, income };
  }),
});

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { pluggyRouter } from "./pluggy-router";
import { expenseRouter } from "./expense-router";
import { bankRouter } from "./bank-router";
import { incomeRouter } from "./income-router";
import { budgetRouter } from "./budget-router";
import { historyRouter } from "./history-router";
import { migrationRouter } from "./migration-router";
import { adminRouter } from "./admin-router";
import { uberEarningsRouter } from "./uber-earnings-router";
import { assistantRouter } from "./assistant-router";
import { profileRouter } from "./profile-router";
import { categoryRouter } from "./category-router";
import { debtorRouter } from "./debtor-router";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  pluggy: pluggyRouter,
  expense: expenseRouter,
  bank: bankRouter,
  income: incomeRouter,
  budget: budgetRouter,
  history: historyRouter,
  migration: migrationRouter,
  admin: adminRouter,
  uberEarnings: uberEarningsRouter,
  assistant: assistantRouter,
  profile: profileRouter,
  category: categoryRouter,
  debtor: debtorRouter,
});

export type AppRouter = typeof appRouter;

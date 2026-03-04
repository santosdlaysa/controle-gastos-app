import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { pluggyRouter } from "./pluggy-router";
import { expenseRouter } from "./expense-router";
import { incomeRouter } from "./income-router";
import { budgetRouter } from "./budget-router";
import { historyRouter } from "./history-router";
import { migrationRouter } from "./migration-router";
import { adminRouter } from "./admin-router";
import { uberEarningsRouter } from "./uber-earnings-router";

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
  income: incomeRouter,
  budget: budgetRouter,
  history: historyRouter,
  migration: migrationRouter,
  admin: adminRouter,
  uberEarnings: uberEarningsRouter,
});

export type AppRouter = typeof appRouter;

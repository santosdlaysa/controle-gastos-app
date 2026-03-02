import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getIncome, upsertIncome } from "./expense-db";

export const incomeRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getIncome(ctx.user.id);
  }),

  update: protectedProcedure
    .input(
      z.object({
        salary: z.number().min(0),
        vale: z.number().min(0),
        other: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertIncome(ctx.user.id, {
        salary: input.salary.toFixed(2),
        vale: input.vale.toFixed(2),
        other: input.other.toFixed(2),
      });
      return { success: true };
    }),
});

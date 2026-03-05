import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { upsertUser } from "./db";

export const profileRouter = router({
  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80).trim() }))
    .mutation(async ({ ctx, input }) => {
      await upsertUser({ openId: ctx.user.openId, name: input.name });
      return { name: input.name };
    }),
});

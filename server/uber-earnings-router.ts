import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getUberEarningsByMonth,
  createUberEarning,
  updateUberEarning,
  deleteUberEarning,
} from "./uber-earnings-db";

const entryTypeEnum = z.enum(["ganho", "gasto"]);

export const uberEarningsRouter = router({
  getByMonth: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      return getUberEarningsByMonth(ctx.user.id, input.month);
    }),

  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        category: z.string().min(1),
        entryType: entryTypeEnum,
        value: z.number().positive(),
        date: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createUberEarning({
        userId: ctx.user.id,
        description: input.description,
        category: input.category,
        entryType: input.entryType,
        value: input.value.toFixed(2),
        date: input.date,
        month: input.month,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        description: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        entryType: entryTypeEnum.optional(),
        value: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const data: Parameters<typeof updateUberEarning>[2] = {};
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.category !== undefined) data.category = updates.category;
      if (updates.entryType !== undefined) data.entryType = updates.entryType;
      if (updates.value !== undefined) data.value = updates.value.toFixed(2);
      await updateUberEarning(ctx.user.id, id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteUberEarning(ctx.user.id, input.id);
      return { success: true };
    }),
});

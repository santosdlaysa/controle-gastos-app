import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { userCategories } from "../drizzle/schema";
import { getDb } from "./db";
import { eq, and } from "drizzle-orm";

const DEFAULT_CATEGORIES = [
  { name: 'transporte', label: 'Transporte', color: '#3B82F6', icon: 'directions-car' },
  { name: 'alimentacao', label: 'Alimentação', color: '#10B981', icon: 'restaurant' },
  { name: 'moradia', label: 'Moradia', color: '#F59E0B', icon: 'home' },
  { name: 'saude', label: 'Saúde', color: '#EC4899', icon: 'local-hospital' },
  { name: 'educacao', label: 'Educação', color: '#8B5CF6', icon: 'school' },
  { name: 'lazer', label: 'Lazer', color: '#06B6D4', icon: 'sports-esports' },
  { name: 'outro', label: 'Outro', color: '#6B7280', icon: 'category' },
];

export const categoryRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return DEFAULT_CATEGORIES.map((c, i) => ({ ...c, id: i + 1, userId: ctx.user.id, isDefault: true, createdAt: new Date() }));
    let cats = await db.select().from(userCategories).where(eq(userCategories.userId, ctx.user.id));
    if (cats.length === 0) {
      await db.insert(userCategories).values(
        DEFAULT_CATEGORIES.map(c => ({ userId: ctx.user.id, ...c, isDefault: true }))
      );
      cats = await db.select().from(userCategories).where(eq(userCategories.userId, ctx.user.id));
    }
    return cats;
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      label: z.string().min(1).max(100),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      icon: z.string().min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(userCategories).values({ userId: ctx.user.id, ...input, isDefault: false });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      label: z.string().min(1).max(100),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      icon: z.string().min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...data } = input;
      await db.update(userCategories).set(data).where(
        and(eq(userCategories.id, id), eq(userCategories.userId, ctx.user.id))
      );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(userCategories).where(
        and(eq(userCategories.id, input.id), eq(userCategories.userId, ctx.user.id))
      );
      return { success: true };
    }),
});

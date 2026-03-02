import { and, count, eq, sql } from "drizzle-orm";
import {
  expenses,
  incomes,
  budgets,
  categoryBudgets,
  InsertExpense,
  ExpenseCategory,
} from "../drizzle/schema";
import { getDb } from "./db";

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpensesByMonth(userId: number, month: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, userId), eq(expenses.month, month)));
}

export async function createExpense(
  data: Omit<InsertExpense, "id" | "createdAt" | "updatedAt">,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenses).values(data).returning({ id: expenses.id });
  return result[0].id;
}

export async function updateExpense(
  userId: number,
  id: number,
  data: Partial<Pick<InsertExpense, "name" | "category" | "value" | "quantity" | "paid">>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(expenses)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function deleteExpense(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function bulkCreateExpenses(
  items: Omit<InsertExpense, "id" | "createdAt" | "updatedAt">[],
): Promise<void> {
  if (items.length === 0) return;
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // ON CONFLICT DO NOTHING deduplicates by (userId, clientId) unique index
  await db.insert(expenses).values(items).onConflictDoNothing();
}

// ─── Incomes ──────────────────────────────────────────────────────────────────

export async function getIncome(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(incomes)
    .where(eq(incomes.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertIncome(
  userId: number,
  data: { salary: string; vale: string; other: string },
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(incomes)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: incomes.userId,
      set: { ...data, updatedAt: new Date() },
    });
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export async function getBudget(userId: number, month: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertBudget(
  userId: number,
  month: string,
  totalBudget: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(budgets)
    .values({ userId, month, totalBudget })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.month],
      set: { totalBudget, updatedAt: new Date() },
    });
}

export async function getCategoryBudgets(userId: number, month: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categoryBudgets)
    .where(and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.month, month)));
}

export async function upsertCategoryBudgets(
  userId: number,
  month: string,
  items: Array<{ category: ExpenseCategory; amount: string }>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete + re-insert for simplicity
  await db
    .delete(categoryBudgets)
    .where(and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.month, month)));
  if (items.length > 0) {
    await db.insert(categoryBudgets).values(
      items.map((i) => ({ userId, month, category: i.category, amount: i.amount })),
    );
  }
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getMonthlyHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      month: expenses.month,
      totalExpenses: sql<string>`SUM(${expenses.value})`,
    })
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .groupBy(expenses.month)
    .orderBy(expenses.month);
}

export async function countExpenses(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ total: count() })
    .from(expenses)
    .where(eq(expenses.userId, userId));
  return result[0]?.total ?? 0;
}

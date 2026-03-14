import { and, count, eq, like, sql } from "drizzle-orm";
import {
  expenses,
  incomes,
  budgets,
  categoryBudgets,
  InsertExpense,
  ExpenseCategory,
} from "../drizzle/schema";

type PaymentType = "debit" | "credit";
import { getDb } from "./db";

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpensesByMonth(userId: number, month: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), eq(expenses.month, month)));
  } catch {
    // Fallback: select only core columns in case new columns don't exist yet in DB
    const rows = await db.execute(
      sql`SELECT id, "userId", "clientId", name, category, value, date, month, quantity, paid, source, "createdAt", "updatedAt" FROM expenses WHERE "userId" = ${userId} AND month = ${month}`,
    );
    return (rows as any[]).map((r) => ({ ...r, bank: null, paymentType: null }));
  }
}

export async function getExpensesByBank(
  userId: number,
  bankName: string,
  paymentType?: PaymentType,
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(expenses.userId, userId), eq(expenses.bank, bankName)];
  if (paymentType) conditions.push(eq(expenses.paymentType, paymentType));
  return db.select().from(expenses).where(and(...conditions)).orderBy(expenses.date);
}

export async function getExpensesByYear(userId: number, year: string) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, userId), like(expenses.month, `${year}-%`)));
  } catch {
    const rows = await db.execute(
      sql`SELECT id, "userId", "clientId", name, category, value, date, month, quantity, paid, source, "createdAt", "updatedAt" FROM expenses WHERE "userId" = ${userId} AND month LIKE ${year + '-%'}`,
    );
    return (rows as any[]).map((r) => ({ ...r, bank: null, paymentType: null }));
  }
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
  data: Partial<Pick<InsertExpense, "name" | "category" | "value" | "quantity" | "paid" | "bank" | "paymentType">>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db
      .update(expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  } catch {
    // Fallback: update only core columns if new columns don't exist yet
    const { bank: _b, paymentType: _pt, ...safeData } = data;
    if (Object.keys(safeData).length === 0) return;
    await db
      .update(expenses)
      .set({ ...safeData, updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  }
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

export async function upsertIncomeOverride(
  userId: number,
  month: string,
  incomeOverride: string | null,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(budgets)
    .values({ userId, month, incomeOverride })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.month],
      set: { incomeOverride, updatedAt: new Date() },
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

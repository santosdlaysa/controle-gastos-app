import { and, eq, like } from "drizzle-orm";
import { uberEarnings, InsertUberEarning } from "../drizzle/schema";
import { getDb } from "./db";

export async function getUberEarningsByMonth(userId: number, month: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(uberEarnings)
    .where(and(eq(uberEarnings.userId, userId), eq(uberEarnings.month, month)));
}

export async function getUberEarningsByYear(userId: number, year: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(uberEarnings)
    .where(and(eq(uberEarnings.userId, userId), like(uberEarnings.month, `${year}-%`)));
}

export async function createUberEarning(
  data: Omit<InsertUberEarning, "id" | "createdAt" | "updatedAt">,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(uberEarnings).values(data).returning({ id: uberEarnings.id });
  return result[0].id;
}

export async function updateUberEarning(
  userId: number,
  id: number,
  data: Partial<Pick<InsertUberEarning, "description" | "category" | "entryType" | "value">>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(uberEarnings)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(uberEarnings.id, id), eq(uberEarnings.userId, userId)));
}

export async function deleteUberEarning(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(uberEarnings).where(and(eq(uberEarnings.id, id), eq(uberEarnings.userId, userId)));
}

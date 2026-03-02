import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Expense, MonthlyData, Income } from '@/types/expense';
import type { PluggySyncedExpense } from '@/types/pluggy';
import { mapPluggyCategory } from './pluggy-category-map';

const STORAGE_KEY = 'expenses_data';
const DEFAULT_INCOME: Income = { salary: 0, vale: 0, other: 0 };

export async function mergePluggyExpenses(
  syncedExpenses: PluggySyncedExpense[]
): Promise<{ added: number; skipped: number }> {
  const rawData = await AsyncStorage.getItem(STORAGE_KEY);
  let allData: Record<string, MonthlyData> = rawData ? JSON.parse(rawData) : {};

  // Build set of existing pluggy IDs for O(1) lookup
  const existingIds = new Set<string>();
  for (const monthData of Object.values(allData)) {
    for (const exp of monthData.expenses) {
      if (exp.id.startsWith('pluggy_')) existingIds.add(exp.id);
    }
  }

  let added = 0;
  let skipped = 0;

  for (const synced of syncedExpenses) {
    const id = `pluggy_${synced.pluggyId}`;
    if (existingIds.has(id)) { skipped++; continue; }

    const date = new Date(synced.date);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const expense: Expense = {
      id,
      name: synced.description,
      category: mapPluggyCategory(synced.pluggyCategory),
      value: Math.abs(synced.amount),
      date: synced.date,
      month,
    };

    if (!allData[month]) {
      allData[month] = { month, expenses: [], income: DEFAULT_INCOME };
    }
    allData[month].expenses.push(expense);
    existingIds.add(id);
    added++;
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  return { added, skipped };
}

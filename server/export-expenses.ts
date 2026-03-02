import { z } from 'zod';
import type { Expense, MonthlyData } from '@/types/expense';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'expenses_data';

export const exportSchema = z.object({
  month: z.string().optional(),
});

export async function exportExpenses({ month }: z.infer<typeof exportSchema>) {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { csv: '', json: '[]' };
  }

  const allData: Record<string, MonthlyData> = JSON.parse(raw);

  const targetMonths = month ? [month] : Object.keys(allData);
  const rows: (Expense & { month: string })[] = [];

  for (const m of targetMonths) {
    const data = allData[m];
    if (!data) continue;
    for (const exp of data.expenses) {
      rows.push({ ...exp, month: data.month });
    }
  }

  const header = [
    'id',
    'name',
    'category',
    'quantity',
    'value',
    'date',
    'month',
    'paid',
  ];

  const csvLines = [
    header.join(','),
    ...rows.map((exp) =>
      [
        exp.id,
        JSON.stringify(exp.name),
        exp.category,
        exp.quantity ?? '',
        exp.value.toFixed(2),
        exp.date,
        exp.month,
        exp.paid ? 'true' : 'false',
      ].join(',')
    ),
  ];

  const csv = csvLines.join('\n');
  const json = JSON.stringify(rows, null, 2);

  return { csv, json };
}


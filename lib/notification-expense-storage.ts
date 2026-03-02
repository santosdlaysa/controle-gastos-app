import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Expense, MonthlyData, Income } from '@/types/expense';
import type { ParsedNubankNotification } from './nubank-notification-parser';

const STORAGE_KEY = 'expenses_data';
const PROCESSED_IDS_KEY = 'processed_notification_ids';

const DEFAULT_INCOME: Income = {
  salary: 0,
  vale: 0,
  other: 0,
};

/**
 * Gera um ID único para deduplicação baseado em valor + merchant + timestamp (minuto).
 * Agrupa por minuto para evitar duplicatas de notificações repetidas.
 */
function generateDeduplicationId(parsed: ParsedNubankNotification): string {
  const now = new Date();
  const minuteKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `nubank_${parsed.value}_${parsed.merchant.replace(/\s+/g, '_').toLowerCase()}_${minuteKey}`;
}

/**
 * Verifica se uma notificação já foi processada.
 */
async function wasAlreadyProcessed(deduplicationId: string): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(PROCESSED_IDS_KEY);
    if (!data) return false;
    const ids: string[] = JSON.parse(data);
    return ids.includes(deduplicationId);
  } catch {
    return false;
  }
}

/**
 * Marca uma notificação como processada.
 * Mantém no máximo 500 IDs (remove os mais antigos).
 */
async function markAsProcessed(deduplicationId: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(PROCESSED_IDS_KEY);
    let ids: string[] = data ? JSON.parse(data) : [];
    ids.push(deduplicationId);
    // Limita a 500 IDs para não crescer indefinidamente
    if (ids.length > 500) {
      ids = ids.slice(-500);
    }
    await AsyncStorage.setItem(PROCESSED_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error('Error marking notification as processed:', error);
  }
}

/**
 * Adiciona uma despesa a partir de uma notificação do Nubank parseada.
 * Grava diretamente no AsyncStorage usando o mesmo formato do useExpenses.
 * Retorna a despesa criada ou null se duplicata.
 */
export async function addExpenseFromNotification(
  parsed: ParsedNubankNotification
): Promise<Expense | null> {
  const deduplicationId = generateDeduplicationId(parsed);

  // Verifica duplicata
  if (await wasAlreadyProcessed(deduplicationId)) {
    console.log('Notification already processed:', deduplicationId);
    return null;
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const expense: Expense = {
    id: `nubank_${Date.now()}`,
    name: parsed.merchant,
    category: parsed.category,
    value: parsed.value,
    date: now.toISOString(),
    month,
  };

  try {
    // Lê dados existentes
    const rawData = await AsyncStorage.getItem(STORAGE_KEY);
    let allData: Record<string, MonthlyData> = {};

    if (rawData) {
      try {
        allData = JSON.parse(rawData);
      } catch {
        allData = {};
      }
    }

    // Garante que o mês existe
    if (!allData[month]) {
      allData[month] = {
        month,
        expenses: [],
        income: DEFAULT_INCOME,
      };
    }

    // Adiciona despesa
    allData[month].expenses.push(expense);

    // Salva
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

    // Marca como processada
    await markAsProcessed(deduplicationId);

    console.log('Auto expense added:', expense.name, expense.value);
    return expense;
  } catch (error) {
    console.error('Error adding expense from notification:', error);
    return null;
  }
}

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from '@/components/screen-container';
import { MonthlyData } from '@/types/expense';

const STORAGE_KEY = 'expenses_data';
const INCOME_KEY = 'income_settings';

interface MonthSummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  budget?: number;
}

const getMonthLabel = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [raw, incomeRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(INCOME_KEY),
      ]);

      if (!raw) {
        setSummaries([]);
        return;
      }

      const income = incomeRaw ? JSON.parse(incomeRaw) : { salary: 0, vale: 0, other: 0 };
      const totalIncome = (income.salary || 0) + (income.vale || 0) + (income.other || 0);

      const allData: Record<string, MonthlyData> = JSON.parse(raw);
      const items: MonthSummary[] = Object.values(allData).map((m) => {
        const totalExpenses = (m.expenses || []).reduce(
          (sum, exp) => sum + exp.value,
          0
        );
        const balance = totalIncome - totalExpenses;
        return {
          month: m.month,
          totalIncome,
          totalExpenses,
          balance,
          budget: m.budget,
        };
      });

      items.sort((a, b) => (a.month < b.month ? 1 : -1));

      setSummaries(items);
    } catch (error) {
      console.error('Error loading history:', error);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const maxExpenses = summaries.reduce(
    (max, m) => Math.max(max, m.totalExpenses),
    0
  );

  return (
    <ScreenContainer className="p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-bold text-foreground mb-6">
          Histórico
        </Text>

        <Text className="text-sm text-muted mb-4">
          Veja como sua renda, despesas e saldo variaram ao longo dos meses.
        </Text>

        {loading ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#0a7ea4" />
          </View>
        ) : summaries.length === 0 ? (
          <View className="bg-surface rounded-2xl p-6 items-center">
            <Text className="text-muted text-center">
              Ainda não há dados salvos para exibir o histórico.
            </Text>
          </View>
        ) : (
          <>
            {/* Simple bar \"graph\" of expenses by month */}
            <View className="bg-surface rounded-2xl p-4 mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">
                Despesas por mês
              </Text>

              {summaries.map((m) => {
                const ratio =
                  maxExpenses > 0 ? Math.max(0.05, m.totalExpenses / maxExpenses) : 0;
                return (
                  <View key={m.month} className="mb-2">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-xs font-medium text-foreground">
                        {getMonthLabel(m.month)}
                      </Text>
                      <Text className="text-xs text-muted">
                        R$ {m.totalExpenses.toFixed(2)}
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <View
                        className="h-2 rounded-full bg-warning"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Detailed list */}
            {summaries.map((m) => {
              const income = m.totalIncome;
              const expenses = m.totalExpenses;
              const balance = m.balance;
              const budget = m.budget;
              const budgetUsedPercent =
                budget && budget > 0
                  ? Math.min(999, (expenses / budget) * 100)
                  : null;

              return (
                <View
                  key={m.month}
                  className="bg-surface rounded-2xl p-4 mb-4 border border-border"
                >
                  <Text className="text-base font-semibold text-foreground mb-2">
                    {getMonthLabel(m.month)}
                  </Text>

                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-muted">Renda</Text>
                    <Text className="text-xs font-semibold text-success">
                      R$ {income.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-muted">Despesas</Text>
                    <Text className="text-xs font-semibold text-warning">
                      R$ {expenses.toFixed(2)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-xs text-muted">Saldo</Text>
                    <Text
                      className={`text-xs font-semibold ${
                        balance >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      R$ {balance.toFixed(2)}
                    </Text>
                  </View>

                  {!!budget && budget > 0 && (
                    <View className="mt-1">
                      <Text className="text-xs text-muted mb-1">
                        Orçamento: R$ {budget.toFixed(2)}{' '}
                        {budgetUsedPercent !== null &&
                          `· ${budgetUsedPercent.toFixed(0)}% usado`}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}


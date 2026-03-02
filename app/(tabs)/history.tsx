import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const getMonthLabel = (monthStr: string) => {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};

export default function HistoryScreen() {
  const { data, isLoading } = trpc.history.getSummaries.useQuery();

  const income = data?.income;
  const totalIncome = income
    ? parseFloat(income.salary ?? "0") +
      parseFloat(income.vale ?? "0") +
      parseFloat(income.other ?? "0")
    : 0;

  const summaries = (data?.monthlyData ?? [])
    .map((m) => {
      const totalExpenses = parseFloat(m.totalExpenses ?? "0");
      return {
        month: m.month,
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
      };
    })
    .sort((a, b) => (a.month < b.month ? 1 : -1));

  const maxExpenses = summaries.reduce((max, m) => Math.max(max, m.totalExpenses), 0);

  return (
    <ScreenContainer className="p-6">
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-bold text-foreground mb-6">Histórico</Text>

        <Text className="text-sm text-muted mb-4">
          Veja como sua renda, despesas e saldo variaram ao longo dos meses.
        </Text>

        {isLoading ? (
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
            {/* Simple bar graph of expenses by month */}
            <View className="bg-surface rounded-2xl p-4 mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">Despesas por mês</Text>

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
            {summaries.map((m) => (
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
                    R$ {m.totalIncome.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-muted">Despesas</Text>
                  <Text className="text-xs font-semibold text-warning">
                    R$ {m.totalExpenses.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-xs text-muted">Saldo</Text>
                  <Text
                    className={`text-xs font-semibold ${
                      m.balance >= 0 ? "text-success" : "text-error"
                    }`}
                  >
                    R$ {m.balance.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

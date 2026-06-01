import { ActivityIndicator, ScrollView, Text, View, Pressable, Modal } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ExpenseItem } from "@/components/expense-item";
import { trpc } from "@/lib/trpc";
import { getAppMode } from "@/lib/mode";
import { useColors } from "@/hooks/use-colors";
import { useCategories } from "@/hooks/use-categories";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Expense } from "@/types/expense";

const fmt = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getMonthLabel = (monthStr: string) => {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

const getShortMonthLabel = (monthStr: string) => {
  const [, month] = monthStr.split("-");
  const date = new Date(2000, parseInt(month, 10) - 1);
  return date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

// ─── MODAL: DESPESAS DO MÊS ──────────────────────────────────────────────────

function MonthExpensesModal({ month, onClose }: { month: string | null; onClose: () => void }) {
  const colors = useColors();
  const { colorMap, labelMap, iconMap } = useCategories();
  const { data, isLoading } = trpc.expense.getByMonth.useQuery(
    { month: month ?? "" },
    { enabled: !!month },
  );

  const expenses: Expense[] = useMemo(() => {
    return (data ?? [])
      .map((row) => ({
        id: String(row.id),
        name: row.name,
        category: row.category as Expense["category"],
        value: parseFloat(String(row.value)),
        date: row.date,
        month: row.month,
        quantity: row.quantity ?? undefined,
        paid: row.paid ?? undefined,
        bank: row.bank ?? null,
        paymentType: (row.paymentType as Expense["paymentType"]) ?? null,
        expenseType: (row.expenseType as Expense["expenseType"]) ?? null,
        debtorName: (row as { debtorName?: string | null }).debtorName ?? null,
      }))
      .sort((a, b) => {
        // Ordena por data (dia) crescente; sem data vai para o fim
        if (a.date && b.date) return a.date.localeCompare(b.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      });
  }, [data]);

  const total = useMemo(() => expenses.reduce((s, e) => s + e.value, 0), [expenses]);

  return (
    <Modal visible={!!month} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '85%' }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 12 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="receipt-long" size={20} color="#0a7ea4" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, textTransform: 'capitalize' }}>
                {month ? getMonthLabel(month) : ''}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {expenses.length} {expenses.length === 1 ? 'despesa' : 'despesas'}
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.error }}>
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#0a7ea4" style={{ marginVertical: 32 }} />
          ) : expenses.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Nenhuma despesa</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' }}>Este mês não possui despesas registradas.</Text>
            </View>
          ) : (
            <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
              {expenses.map((exp) => (
                <ExpenseItem
                  key={exp.id}
                  expense={exp}
                  onPress={() => {}}
                  colorMap={colorMap}
                  labelMap={labelMap}
                  iconMap={iconMap}
                />
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── HISTÓRICO DESPESAS PESSOAIS ─────────────────────────────────────────────

function PersonalHistory() {
  const colors = useColors();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.history.getSummaries.useQuery();

  useFocusEffect(useCallback(() => {
    utils.history.getSummaries.invalidate();
  }, [utils]));

  const income = data?.income;
  const totalIncome = income
    ? parseFloat(income.salary ?? "0") +
      parseFloat(income.vale ?? "0") +
      parseFloat(income.other ?? "0")
    : 0;

  const summaries = (data?.monthlyData ?? [])
    .filter((m) => m.month.startsWith(year))
    .map((m) => {
      const totalExpenses = parseFloat(m.totalExpenses ?? "0");
      return { month: m.month, totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
    })
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  const totalExpensesYear = summaries.reduce((s, m) => s + m.totalExpenses, 0);
  // totalIncome é um valor mensal fixo — não multiplicar pelo nº de meses
  // O saldo acumulado é a soma dos saldos mensais reais
  const totalBalanceYear = summaries.reduce((s, m) => s + m.balance, 0);
  const maxExpenses = summaries.reduce((max, m) => Math.max(max, m.totalExpenses), 0);

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>

        {/* ─── HERO ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0c3a5e' }}>
          {/* Toolbar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
            <View style={{ width: 32 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="account-balance-wallet" size={16} color="#fff" />
              </View>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>Histórico Pessoal</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          {/* Year navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 8 }}>
            <Pressable onPress={() => setYear(y => String(parseInt(y) - 1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-left" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' }}>{year}</Text>
            <Pressable onPress={() => setYear(y => String(parseInt(y) + 1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-right" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Hero: Saldo anual */}
          <View style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Saldo {year}
            </Text>
            {isLoading ? (
              <ActivityIndicator color="#93C5FD" size="large" style={{ marginVertical: 8 }} />
            ) : (
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ color: totalBalanceYear >= 0 ? '#93C5FD' : '#FCA5A5', fontSize: 46, fontWeight: '800', letterSpacing: -2, lineHeight: 54, textAlign: 'center', alignSelf: 'stretch' }}
              >
                R$ {fmt(totalBalanceYear)}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: totalBalanceYear >= 0 ? '#93C5FD' : '#FCA5A5' }} />
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                {summaries.length} {summaries.length === 1 ? 'mês' : 'meses'} com registros
              </Text>
            </View>
          </View>

          {/* Cards: Renda + Despesas */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(147,197,253,0.25)' }}>
              <Text style={{ color: '#93C5FD', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Renda Mensal</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>R$ {fmt(totalIncome)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>valor fixo por mês</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(252,165,165,0.25)' }}>
              <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Total Despesas</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>R$ {fmt(totalExpensesYear)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>{summaries.length} meses rastreados</Text>
            </View>
          </View>
        </View>

        {/* ─── CONTENT ──────────────────────────────────── */}
        <View className="bg-background" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 }}>

          {!isLoading && summaries.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <MaterialIcons name="account-balance-wallet" size={32} color="#0a7ea4" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, marginBottom: 4 }}>Nenhum registro em {year}</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>Use as setas acima para navegar entre os anos.</Text>
            </View>
          ) : (
            <>
              {/* Gráfico de barras */}
              <View style={{ margin: 16, backgroundColor: colors.surface, borderRadius: 20, padding: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>Despesas por mês</Text>
                {isLoading ? (
                  <ActivityIndicator color="#0a7ea4" />
                ) : summaries.map((m) => {
                  const ratio = maxExpenses > 0 ? Math.max(0.04, m.totalExpenses / maxExpenses) : 0;
                  return (
                    <Pressable key={m.month} onPress={() => setSelectedMonth(m.month)} style={({ pressed }) => [{ marginBottom: 10, opacity: pressed ? 0.6 : 1 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: '500', textTransform: 'capitalize' }}>
                          {getShortMonthLabel(m.month)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Text style={{ fontSize: 11, color: colors.error, fontWeight: '600' }}>-R$ {fmt(m.totalExpenses)}</Text>
                          <Text style={{ fontSize: 11, color: m.balance >= 0 ? '#0a7ea4' : colors.error }}>
                            {m.balance >= 0 ? '▲' : '▼'} R$ {fmt(Math.abs(m.balance))}
                          </Text>
                        </View>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.error, width: `${ratio * 100}%` }} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Cards mensais */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>Por mês</Text>
                {isLoading ? (
                  <ActivityIndicator color="#0a7ea4" style={{ marginVertical: 24 }} />
                ) : summaries.map((m) => (
                  <Pressable key={m.month} onPress={() => setSelectedMonth(m.month)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, textTransform: 'capitalize' }}>
                          {getMonthLabel(m.month)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#0a7ea4' }}>Ver despesas</Text>
                          <MaterialIcons name="chevron-right" size={16} color="#0a7ea4" />
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1, backgroundColor: '#0a7ea410', borderRadius: 12, padding: 10 }}>
                          <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Renda</Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0a7ea4' }}>R$ {fmt(m.totalIncome)}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: colors.error + '12', borderRadius: 12, padding: 10 }}>
                          <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Despesas</Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.error }}>R$ {fmt(m.totalExpenses)}</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: m.balance >= 0 ? '#0a7ea410' : colors.error + '12', borderRadius: 12, padding: 10 }}>
                          <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Saldo</Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: m.balance >= 0 ? '#0a7ea4' : colors.error }}>
                            R$ {fmt(m.balance)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <MonthExpensesModal month={selectedMonth} onClose={() => setSelectedMonth(null)} />
    </ScreenContainer>
  );
}

// ─── HISTÓRICO GANHOS UBER ───────────────────────────────────────────────────

function UberHistory() {
  const colors = useColors();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, isLoading } = trpc.uberEarnings.getByYear.useQuery({ year });

  const summaries = (() => {
    if (!data || data.length === 0) return [];
    const byMonth: Record<string, { ganhos: number; gastos: number }> = {};
    for (const entry of data) {
      const m = entry.month;
      if (!byMonth[m]) byMonth[m] = { ganhos: 0, gastos: 0 };
      const v = parseFloat(entry.value ?? "0");
      if (entry.entryType === "ganho") byMonth[m].ganhos += v;
      else byMonth[m].gastos += v;
    }
    return Object.entries(byMonth)
      .map(([month, { ganhos, gastos }]) => ({ month, ganhos, gastos, lucro: ganhos - gastos }))
      .sort((a, b) => (a.month < b.month ? 1 : -1));
  })();

  const totalGanhos = summaries.reduce((s, m) => s + m.ganhos, 0);
  const totalGastos = summaries.reduce((s, m) => s + m.gastos, 0);
  const totalLucro = totalGanhos - totalGastos;
  const maxGanhos = summaries.reduce((max, m) => Math.max(max, m.ganhos), 0);

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>

        {/* ─── HERO ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0c3a5e' }}>
          {/* Toolbar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
            <View style={{ width: 32 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="directions-car" size={16} color="#fff" />
              </View>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>Histórico Uber</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          {/* Year navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 8 }}>
            <Pressable onPress={() => setYear(y => String(parseInt(y) - 1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-left" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' }}>{year}</Text>
            <Pressable onPress={() => setYear(y => String(parseInt(y) + 1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-right" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Hero: Lucro Líquido anual */}
          <View style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Lucro Líquido {year}
            </Text>
            {isLoading ? (
              <ActivityIndicator color="#93C5FD" size="large" style={{ marginVertical: 8 }} />
            ) : (
              <Text style={{ color: totalLucro >= 0 ? '#93C5FD' : '#FCA5A5', fontSize: 46, fontWeight: '800', letterSpacing: -2, lineHeight: 54 }}>
                R$ {fmt(totalLucro)}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: totalLucro >= 0 ? '#93C5FD' : '#FCA5A5' }} />
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                {summaries.length} {summaries.length === 1 ? 'mês' : 'meses'} com registros
              </Text>
            </View>
          </View>

          {/* Cards: Total Ganhos + Total Gastos */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(147,197,253,0.25)' }}>
              <Text style={{ color: '#93C5FD', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Total Ganhos</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>R$ {fmt(totalGanhos)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>acumulado no ano</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(252,165,165,0.25)' }}>
              <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Total Gastos</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>R$ {fmt(totalGastos)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>acumulado no ano</Text>
            </View>
          </View>
        </View>

        {/* ─── CONTENT ──────────────────────────────────── */}
        <View className="bg-background" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 }}>

          {!isLoading && summaries.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <MaterialIcons name="directions-car" size={32} color="#0a7ea4" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, marginBottom: 4 }}>Nenhum registro em {year}</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>Use as setas acima para navegar entre os anos.</Text>
            </View>
          ) : (
            <>
              {/* Gráfico de barras */}
              <View style={{ margin: 16, backgroundColor: colors.surface, borderRadius: 20, padding: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 12 }}>Ganhos por mês</Text>
                {isLoading ? (
                  <ActivityIndicator color="#0a7ea4" />
                ) : summaries.map((m) => {
                  const ratio = maxGanhos > 0 ? Math.max(0.04, m.ganhos / maxGanhos) : 0;
                  const lucroPositivo = m.lucro >= 0;
                  return (
                    <View key={m.month} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: '500', textTransform: 'capitalize' }}>
                          {getShortMonthLabel(m.month)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Text style={{ fontSize: 11, color: '#0a7ea4', fontWeight: '600' }}>+R$ {fmt(m.ganhos)}</Text>
                          <Text style={{ fontSize: 11, color: lucroPositivo ? colors.muted : colors.error }}>
                            {lucroPositivo ? '▲' : '▼'} R$ {fmt(Math.abs(m.lucro))}
                          </Text>
                        </View>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' }}>
                        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#0a7ea4', width: `${ratio * 100}%` }} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Cards mensais */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 10 }}>
                  Por mês
                </Text>
                {isLoading ? (
                  <ActivityIndicator color="#0a7ea4" style={{ marginVertical: 24 }} />
                ) : summaries.map((m) => (
                  <View key={m.month} style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground, marginBottom: 12, textTransform: 'capitalize' }}>
                      {getMonthLabel(m.month)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1, backgroundColor: '#0a7ea410', borderRadius: 12, padding: 10 }}>
                        <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ganhos</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0a7ea4' }}>R$ {fmt(m.ganhos)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: colors.error + '12', borderRadius: 12, padding: 10 }}>
                        <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Gastos</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.error }}>R$ {fmt(m.gastos)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: m.lucro >= 0 ? '#0a7ea410' : colors.error + '12', borderRadius: 12, padding: 10 }}>
                        <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lucro</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: m.lucro >= 0 ? '#0a7ea4' : colors.error }}>
                          R$ {fmt(m.lucro)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const [mode, setMode] = useState(getAppMode());

  useFocusEffect(
    useCallback(() => {
      setMode(getAppMode());
    }, [])
  );

  return mode === "uber" ? <UberHistory /> : <PersonalHistory />;
}

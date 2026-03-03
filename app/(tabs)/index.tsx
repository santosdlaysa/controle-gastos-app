import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '@/components/screen-container';
import { ExpenseItem } from '@/components/expense-item';
import { ExpenseModal } from '@/components/expense-modal';
import { useExpenses } from '@/hooks/use-expenses';
import { Expense, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/expense';

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthName = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const addMonths = (monthStr: string, months: number) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1 + months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export default function HomeScreen() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [showOnlyInstallments, setShowOnlyInstallments] = useState(false);

  const {
    expenses,
    income,
    loading,
    totalIncome,
    totalExpenses,
    balance,
    budget,
    categoryBudgets,
    incomeOverride,
    addExpense,
    updateExpense,
    deleteExpense,
    moveExpenseToNextMonth,
    generateRemainingInstallments,
    updateIncomeOverride,
    reload,
  } = useExpenses(currentMonth);

  const colors = useColors();
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const incomeInputRef = useRef<TextInput>(null);

  const handleStartEditIncome = () => {
    setIncomeInput(totalIncome > 0 ? totalIncome.toFixed(2) : '');
    setEditingIncome(true);
    setTimeout(() => incomeInputRef.current?.focus(), 50);
  };

  const handleSaveIncome = async () => {
    const val = parseFloat(incomeInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('Valor inválido', 'Digite um valor numérico válido.');
      return;
    }
    try {
      await updateIncomeOverride(val);
      setEditingIncome(false);
    } catch (err) {
      Alert.alert('Erro ao salvar', err instanceof Error ? err.message : String(err));
    }
  };

  const handleClearIncomeOverride = async () => {
    try {
      await updateIncomeOverride(null);
      setEditingIncome(false);
    } catch (err) {
      Alert.alert('Erro ao restaurar', err instanceof Error ? err.message : String(err));
    }
  };

  const {
    categoryTotals,
    unpaidCount,
    unpaidTotal,
    percentOfIncome,
    filteredExpenses,
    budgetUsagePercent,
  } = useMemo(() => {
    const totals: Partial<Record<ExpenseCategory, number>> = {};
    let unpaidCountAcc = 0;
    let unpaidTotalAcc = 0;

    for (const exp of expenses) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.value;

      if (!exp.paid) {
        unpaidCountAcc += 1;
        unpaidTotalAcc += exp.value;
      }
    }

    const percent =
      totalIncome > 0 ? Math.min(999, (totalExpenses / totalIncome) * 100) : 0;

    const budgetPercent =
      budget && budget > 0 ? Math.min(999, (totalExpenses / budget) * 100) : 0;

    const filtered = expenses.filter((exp) => {
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
        return false;
      }
      if (showOnlyUnpaid && exp.paid) {
        return false;
      }
      if (showOnlyInstallments && !exp.quantity) {
        return false;
      }
      return true;
    });

    return {
      categoryTotals: totals,
      unpaidCount: unpaidCountAcc,
      unpaidTotal: unpaidTotalAcc,
      percentOfIncome: percent,
      filteredExpenses: filtered,
      budgetUsagePercent: budgetPercent,
    };
  }, [
    expenses,
    totalIncome,
    totalExpenses,
    selectedCategory,
    showOnlyUnpaid,
    showOnlyInstallments,
    budget,
  ]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleAddExpense = useCallback(() => {
    setSelectedExpense(undefined);
    setModalVisible(true);
  }, []);

  const handleEditExpense = useCallback((expense: Expense) => {
    setSelectedExpense(expense);
    setModalVisible(true);
  }, []);

  const handleTogglePaid = useCallback(
    async (expense: Expense) => {
      await updateExpense(expense.id, { paid: !expense.paid });
    },
    [updateExpense]
  );

  const handleSaveExpense = useCallback(
    async (data: Omit<Expense, 'id' | 'date' | 'month'>) => {
      if (selectedExpense) {
        await updateExpense(selectedExpense.id, data);
      } else {
        await addExpense(data);
      }
    },
    [selectedExpense, addExpense, updateExpense]
  );

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      await deleteExpense(id);
    },
    [deleteExpense]
  );

  const handleMoveExpenseToNextMonth = useCallback(
    async (id: string) => {
      await moveExpenseToNextMonth(id);
    },
    [moveExpenseToNextMonth]
  );

  const handleGenerateRemainingInstallments = useCallback(
    async (id: string) => {
      await generateRemainingInstallments(id);
    },
    [generateRemainingInstallments]
  );

  const handlePreviousMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isCurrentMonth = currentMonth === getCurrentMonth();

  return (
    <ScreenContainer className="p-0">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-surface border-b border-border">
          <Pressable
            onPress={handlePreviousMonth}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text className="text-2xl text-primary">←</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-foreground capitalize">
            {getMonthName(currentMonth)}
          </Text>
          <Pressable
            onPress={handleNextMonth}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text className="text-2xl text-primary">→</Text>
          </Pressable>
        </View>

        {/* Summary Cards */}
        <View className="px-6 py-4 gap-3">
          {/* Total Income */}
          <View className="bg-success/10 rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm text-muted">Renda Total</Text>
                {incomeOverride !== null && (
                  <View className="bg-success/30 rounded-full px-2 py-0.5">
                    <Text className="text-success text-[10px] font-semibold">personalizada</Text>
                  </View>
                )}
              </View>
              {incomeOverride !== null && !editingIncome && (
                <Pressable onPress={handleClearIncomeOverride} hitSlop={8} className="flex-row items-center gap-1">
                  <MaterialIcons name="restart-alt" size={16} color={colors.muted} />
                  <Text className="text-muted text-[11px]">Restaurar padrão</Text>
                </Pressable>
              )}
            </View>

            {editingIncome ? (
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-bold text-success">R$</Text>
                <TextInput
                  ref={incomeInputRef}
                  value={incomeInput}
                  onChangeText={setIncomeInput}
                  onSubmitEditing={handleSaveIncome}
                  keyboardType="decimal-pad"
                  style={{ fontSize: 24, fontWeight: 'bold', color: colors.success, flex: 1 }}
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                />
                <Pressable onPress={handleSaveIncome} hitSlop={8}>
                  <MaterialIcons name="check-circle" size={28} color={colors.success} />
                </Pressable>
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl font-bold text-success">
                  R$ {totalIncome.toFixed(2)}
                </Text>
                <Pressable onPress={handleStartEditIncome} hitSlop={8}>
                  <MaterialIcons name="edit" size={18} color={colors.muted} />
                </Pressable>
              </View>
            )}

            <Text className="text-[11px] text-muted mt-1">
              {incomeOverride !== null
                ? `Padrão: R$ ${(income.salary + income.vale + income.other).toFixed(2)} · Toque em ✎ para editar`
                : 'Toque em ✎ para ajustar a renda deste mês'}
            </Text>
          </View>

          {/* Total Expenses */}
          <View className="bg-warning/10 rounded-2xl p-4">
            <Text className="text-sm text-muted mb-1">Total de Despesas</Text>
            <Text className="text-2xl font-bold text-warning">
              R$ {totalExpenses.toFixed(2)}
            </Text>
          </View>

          {/* Balance */}
          <View
            className={`rounded-2xl p-4 ${
              balance >= 0 ? 'bg-success/10' : 'bg-error/10'
            }`}
          >
            <Text className="text-sm text-muted mb-1">Saldo Restante</Text>
            <Text
              className={`text-2xl font-bold ${
                balance >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              R$ {balance.toFixed(2)}
            </Text>
          </View>

          {/* Monthly budget usage */}
          {budget > 0 && (
            <View className="rounded-2xl p-4 bg-primary/5 border border-primary/30">
              <Text className="text-sm text-muted mb-1">
                Uso do orçamento mensal (R$ {budget.toFixed(2)})
              </Text>
              <Text className="text-xl font-bold text-primary">
                {budgetUsagePercent.toFixed(0)}% usado
              </Text>
              <Text className="mt-1 text-xs text-muted">
                Já gasto: R$ {totalExpenses.toFixed(2)} · Restante:{' '}
                R$ {(Math.max(budget - totalExpenses, 0)).toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Expenses List + Resumos */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">
              Despesas ({filteredExpenses.length}/{expenses.length})
            </Text>
          </View>

          {/* Indicadores rápidos */}
          <View className="mb-4 gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1 rounded-2xl bg-primary/10 p-3">
                <Text className="text-xs text-muted mb-1">
                  Uso da renda neste mês
                </Text>
                <Text className="text-xl font-bold text-primary">
                  {totalIncome > 0 ? `${percentOfIncome.toFixed(0)}%` : '--'}
                </Text>
                <Text className="mt-1 text-[11px] text-muted">
                  R$ {totalExpenses.toFixed(2)} de R$ {totalIncome.toFixed(2)}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl bg-warning/10 p-3">
                <Text className="text-xs text-muted mb-1">
                  Despesas não pagas
                </Text>
                <Text className="text-xl font-bold text-warning">
                  {unpaidCount} itens
                </Text>
                <Text className="mt-1 text-[11px] text-muted">
                  Total pendente: R$ {unpaidTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Filtros rápidos */}
          <View className="mb-4 gap-2">
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() =>
                  setShowOnlyUnpaid((prev) => !prev)
                }
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View
                  className={`px-3 py-1.5 rounded-full border ${
                    showOnlyUnpaid
                      ? 'bg-success/20 border-success'
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text className={`text-xs ${showOnlyUnpaid ? 'text-success' : 'text-foreground'}`}>
                    Somente não pagas
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() =>
                  setShowOnlyInstallments((prev) => !prev)
                }
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View
                  className={`px-3 py-1.5 rounded-full border ${
                    showOnlyInstallments
                      ? 'bg-primary/20 border-primary'
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text className={`text-xs ${showOnlyInstallments ? 'text-primary' : 'text-foreground'}`}>
                    Somente parcelas
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Resumo por categoria */}
          <View className="mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <Pressable
                onPress={() => setSelectedCategory('all')}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View
                  className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                    selectedCategory === 'all'
                      ? 'bg-primary border-primary'
                      : 'bg-surface border-border'
                  }`}
                >
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: selectedCategory === 'all' ? '#fff' : '#888' }}
                  />
                  <View>
                    <Text
                      className="text-[11px] font-semibold text-foreground"
                      style={{ color: selectedCategory === 'all' ? '#ffffff' : undefined }}
                    >
                      Todas
                    </Text>
                    <Text
                      className="text-[10px] text-muted"
                      style={{ color: selectedCategory === 'all' ? 'rgba(255,255,255,0.7)' : undefined }}
                    >
                      {expenses.length} despesa{expenses.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map(
                (cat) => {
                  const total = categoryTotals[cat] || 0;
                  const catBudget = categoryBudgets?.[cat];
                  const catPercent =
                    catBudget && catBudget > 0
                      ? Math.min(999, (total / catBudget) * 100)
                      : null;
                  const isSelected = selectedCategory === cat;
                  const color = CATEGORY_COLORS[cat];

                  return (
                    <Pressable
                      key={cat}
                      onPress={() =>
                        setSelectedCategory((prev) =>
                          prev === cat ? 'all' : cat
                        )
                      }
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View
                        className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                          isSelected
                            ? 'bg-surface border-transparent'
                            : 'bg-surface border-border'
                        }`}
                      >
                        <View
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <View>
                          <Text className="text-[11px] font-semibold text-foreground">
                            {CATEGORY_LABELS[cat]}
                          </Text>
                          {catBudget && catBudget > 0 ? (
                            <Text className="text-[10px] text-muted">
                              R$ {total.toFixed(2)} de R$ {catBudget.toFixed(2)}{' '}
                              {catPercent !== null && `(${catPercent.toFixed(0)}%)`}
                            </Text>
                          ) : (
                            <Text className="text-[10px] text-muted">
                              R$ {total.toFixed(2)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          </View>

          {loading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color="#0a7ea4" />
            </View>
          ) : expenses.length === 0 ? (
            <View className="bg-surface rounded-lg p-6 items-center">
              <Text className="text-muted text-center">
                Nenhuma despesa registrada neste mês.
              </Text>
            </View>
          ) : filteredExpenses.length === 0 ? (
            <View className="bg-surface rounded-lg p-6 items-center">
              <Text className="text-muted text-center">
                Nenhuma despesa encontrada com os filtros atuais.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredExpenses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ExpenseItem
                  expense={item}
                  onPress={handleEditExpense}
                  onTogglePaid={handleTogglePaid}
                />
              )}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Spacing for FAB */}
        <View className="h-16" />
      </ScrollView>

      {/* FAB - Add Expense */}
      <TouchableOpacity
        onPress={handleAddExpense}
        activeOpacity={0.8}
        style={{
          position: 'absolute',
          bottom: 16,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#0a7ea4',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <Text className="text-2xl text-background font-bold">+</Text>
      </TouchableOpacity>

      {/* Expense Modal */}
      <ExpenseModal
        visible={modalVisible}
        expense={selectedExpense}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveExpense}
        onDelete={handleDeleteExpense}
        onMoveToNextMonth={handleMoveExpenseToNextMonth}
        onGenerateRemainingInstallments={handleGenerateRemainingInstallments}
      />
    </ScreenContainer>
  );
}

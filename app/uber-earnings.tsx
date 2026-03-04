import { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { UberEarningItem } from '@/components/uber-earning-item';
import { UberEarningModal } from '@/components/uber-earning-modal';
import { useUberEarnings } from '@/hooks/use-uber-earnings';
import {
  UberEntry,
  UberEntryType,
  UberCategory,
  UBER_EARNING_CATEGORIES,
  UBER_EXPENSE_CATEGORIES,
  UBER_EARNING_CATEGORY_LABELS,
  UBER_EXPENSE_CATEGORY_LABELS,
  UBER_EARNING_CATEGORY_COLORS,
  UBER_EXPENSE_CATEGORY_COLORS,
  getCategoryColor,
  getCategoryLabel,
} from '@/types/uber-earnings';

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

type ActiveTab = 'todos' | 'ganhos' | 'gastos';

export default function UberEarningsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [modalVisible, setModalVisible] = useState(false);
  const [defaultEntryType, setDefaultEntryType] = useState<UberEntryType>('ganho');
  const [selectedEntry, setSelectedEntry] = useState<UberEntry | undefined>();
  const [activeTab, setActiveTab] = useState<ActiveTab>('todos');
  const [selectedCategory, setSelectedCategory] = useState<UberCategory | 'all'>('all');

  const {
    entries,
    earnings,
    expenses,
    loading,
    totalEarnings,
    totalExpenses,
    netBalance,
    addEntry,
    updateEntry,
    deleteEntry,
    reload,
  } = useUberEarnings(currentMonth);

  // Muda a tab e reseta o filtro de categoria
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedCategory('all');
  };

  const { categoryTotals, filteredEntries, listForTab } = useMemo(() => {
    const tabEntries =
      activeTab === 'ganhos' ? earnings : activeTab === 'gastos' ? expenses : entries;

    const totals: Partial<Record<string, number>> = {};
    for (const e of tabEntries) {
      totals[e.category] = (totals[e.category] || 0) + e.value;
    }

    const filtered = tabEntries.filter((e) => {
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      return true;
    });

    return { categoryTotals: totals, filteredEntries: filtered, listForTab: tabEntries };
  }, [entries, earnings, expenses, activeTab, selectedCategory]);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const handleOpenAdd = useCallback((type: UberEntryType) => {
    setSelectedEntry(undefined);
    setDefaultEntryType(type);
    setModalVisible(true);
  }, []);

  const handleEdit = useCallback((entry: UberEntry) => {
    setSelectedEntry(entry);
    setDefaultEntryType(entry.entryType);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(
    async (data: Omit<UberEntry, 'id' | 'date' | 'month'>) => {
      if (selectedEntry) {
        await updateEntry(selectedEntry.id, data);
      } else {
        await addEntry(data);
      }
    },
    [selectedEntry, addEntry, updateEntry]
  );

  const handleDelete = useCallback(async (id: string) => {
    await deleteEntry(id);
  }, [deleteEntry]);

  // Categorias disponíveis para o filtro de acordo com a aba
  const filterCategories =
    activeTab === 'ganhos'
      ? UBER_EARNING_CATEGORIES
      : activeTab === 'gastos'
      ? UBER_EXPENSE_CATEGORIES
      : [...UBER_EARNING_CATEGORIES, ...UBER_EXPENSE_CATEGORIES];

  return (
    <ScreenContainer className="p-0">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 bg-surface border-b border-border">
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="directions-car" size={20} color="#10B981" />
            <Text className="text-lg font-bold text-foreground">Uber — Ganhos & Gastos</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Navegação de mês */}
        <View className="flex-row items-center justify-between px-6 py-3 bg-surface border-b border-border">
          <Pressable
            onPress={() => setCurrentMonth(addMonths(currentMonth, -1))}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text className="text-2xl text-primary">←</Text>
          </Pressable>
          <Text className="text-base font-semibold text-foreground capitalize">
            {getMonthName(currentMonth)}
          </Text>
          <Pressable
            onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text className="text-2xl text-primary">→</Text>
          </Pressable>
        </View>

        {/* Cards de resumo */}
        <View className="px-6 py-4 gap-3">
          {/* Linha: Ganhos + Gastos */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-success/10 rounded-2xl p-4">
              <Text className="text-xs text-muted mb-1">Total Ganhos</Text>
              <Text className="text-xl font-bold text-success">
                R$ {totalEarnings.toFixed(2)}
              </Text>
              <Text className="text-[10px] text-muted mt-1">
                {earnings.length} registro{earnings.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View className="flex-1 bg-error/10 rounded-2xl p-4">
              <Text className="text-xs text-muted mb-1">Total Gastos</Text>
              <Text className="text-xl font-bold text-error">
                R$ {totalExpenses.toFixed(2)}
              </Text>
              <Text className="text-[10px] text-muted mt-1">
                {expenses.length} registro{expenses.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Lucro líquido */}
          <View
            className={`rounded-2xl p-4 ${
              netBalance >= 0 ? 'bg-success/10' : 'bg-error/10'
            }`}
          >
            <Text className="text-sm text-muted mb-1">Lucro Líquido</Text>
            <Text
              className={`text-2xl font-bold ${
                netBalance >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              R$ {netBalance.toFixed(2)}
            </Text>
            <Text className="text-[11px] text-muted mt-1">
              {netBalance >= 0
                ? 'Você está no lucro este mês 🎉'
                : 'Gastos maiores que ganhos este mês'}
            </Text>
          </View>

          {/* Botões de ação rápida */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => handleOpenAdd('ganho')}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}
            >
              <View className="bg-success rounded-xl p-3 flex-row items-center justify-center gap-2">
                <Text className="text-white text-lg font-bold">+</Text>
                <Text className="text-white font-semibold text-sm">Ganho</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => handleOpenAdd('gasto')}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}
            >
              <View className="bg-error rounded-xl p-3 flex-row items-center justify-center gap-2">
                <Text className="text-white text-lg font-bold">+</Text>
                <Text className="text-white font-semibold text-sm">Gasto</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View className="px-6 mb-2">
          <View className="flex-row bg-surface rounded-xl p-1 border border-border">
            {(
              [
                { key: 'todos', label: 'Todos' },
                { key: 'ganhos', label: '💰 Ganhos' },
                { key: 'gastos', label: '💸 Gastos' },
              ] as { key: ActiveTab; label: string }[]
            ).map(({ key, label }) => (
              <Pressable
                key={key}
                onPress={() => handleTabChange(key)}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}
              >
                <View
                  className={`py-2 rounded-lg items-center ${
                    activeTab === key ? 'bg-primary' : ''
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      activeTab === key ? 'text-white' : 'text-muted'
                    }`}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Lista */}
        <View className="px-6 py-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-foreground">
              {activeTab === 'ganhos'
                ? 'Ganhos'
                : activeTab === 'gastos'
                ? 'Gastos'
                : 'Todos os registros'}{' '}
              ({filteredEntries.length}/{listForTab.length})
            </Text>
          </View>

          {/* Filtro de categoria */}
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
                  className={`rounded-full border px-4 py-2 ${
                    selectedCategory === 'all'
                      ? 'bg-primary border-primary'
                      : 'bg-surface border-border'
                  }`}
                >
                  <Text
                    className="text-[11px] font-semibold"
                    style={{ color: selectedCategory === 'all' ? '#ffffff' : undefined }}
                  >
                    Todos
                  </Text>
                </View>
              </Pressable>

              {filterCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const color = getCategoryColor(cat as UberCategory);
                const total = categoryTotals[cat] || 0;

                return (
                  <Pressable
                    key={cat}
                    onPress={() =>
                      setSelectedCategory((prev) => (prev === cat ? 'all' : (cat as UberCategory)))
                    }
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View
                      className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                        isSelected ? 'border-transparent' : 'border-border'
                      } bg-surface`}
                      style={isSelected ? { borderColor: color, borderWidth: 2 } : undefined}
                    >
                      <View
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <View>
                        <Text className="text-[11px] font-semibold text-foreground">
                          {getCategoryLabel(cat as UberCategory)}
                        </Text>
                        {total > 0 && (
                          <Text className="text-[10px] text-muted">R$ {total.toFixed(2)}</Text>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {loading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          ) : listForTab.length === 0 ? (
            <View className="bg-surface rounded-lg p-6 items-center">
              <MaterialIcons name="directions-car" size={40} color="#9BA1A6" />
              <Text className="text-muted text-center mt-2">
                {activeTab === 'ganhos'
                  ? 'Nenhum ganho registrado neste mês.'
                  : activeTab === 'gastos'
                  ? 'Nenhum gasto registrado neste mês.'
                  : 'Nenhum registro neste mês.'}
              </Text>
              <Text className="text-muted text-center text-xs mt-1">
                Use os botões acima para adicionar
              </Text>
            </View>
          ) : filteredEntries.length === 0 ? (
            <View className="bg-surface rounded-lg p-6 items-center">
              <Text className="text-muted text-center">
                Nenhum registro com o filtro selecionado.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <UberEarningItem earning={item} onPress={handleEdit} />
              )}
              scrollEnabled={false}
            />
          )}
        </View>

        <View className="h-8" />
      </ScrollView>

      <UberEarningModal
        visible={modalVisible}
        earning={selectedEntry}
        defaultEntryType={defaultEntryType}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </ScreenContainer>
  );
}

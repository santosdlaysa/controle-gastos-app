import { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Switch,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useExpenses } from '@/hooks/use-expenses';
import { CATEGORY_LABELS, ExpenseCategory, Income } from '@/types/expense';
import { useAuthContext } from '@/lib/auth-context';
import { useThemeContext } from '@/lib/theme-provider';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export default function SettingsScreen() {
  const month = getCurrentMonth();
  const {
    income,
    budget,
    categoryBudgets,
    updateIncome,
    updateBudget,
    updateCategoryBudgets,
  } = useExpenses(month);
  const { logout } = useAuthContext();
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors();
  const isDark = colorScheme === 'dark';

  const [menuVisible, setMenuVisible] = useState(false);
  const [salary, setSalary] = useState('');
  const [vale, setVale] = useState('');
  const [other, setOther] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<
    Record<ExpenseCategory, string>
  >({
    transporte: '',
    alimentacao: '',
    moradia: '',
    saude: '',
    educacao: '',
    lazer: '',
    outro: '',
  });

  useEffect(() => {
    setSalary(income.salary.toString());
    setVale(income.vale.toString());
    setOther(income.other.toString());
    setMonthlyBudget(budget ? budget.toString() : '');

    setCategoryBudgetInputs((prev) => {
      const updated: Record<ExpenseCategory, string> = { ...prev };
      (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).forEach((cat) => {
        const value = categoryBudgets?.[cat];
        updated[cat] = value != null ? value.toString() : '';
      });
      return updated;
    });
  }, [income, budget, categoryBudgets]);

  const handleSave = async () => {
    const salaryNum = parseFloat(salary) || 0;
    const valeNum = parseFloat(vale) || 0;
    const otherNum = parseFloat(other) || 0;
    const monthlyBudgetNum = parseFloat(monthlyBudget) || 0;

    if (salaryNum < 0 || valeNum < 0 || otherNum < 0 || monthlyBudgetNum < 0) {
      Alert.alert('Erro', 'Os valores não podem ser negativos');
      return;
    }

    const newIncome: Income = {
      salary: salaryNum,
      vale: valeNum,
      other: otherNum,
    };

    await updateIncome(newIncome);
    await updateBudget(monthlyBudgetNum);

    const newCategoryBudgets: Record<ExpenseCategory, number> = {} as Record<
      ExpenseCategory,
      number
    >;
    (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).forEach((cat) => {
      const raw = categoryBudgetInputs[cat];
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        newCategoryBudgets[cat] = num;
      }
    });

    await updateCategoryBudgets(newCategoryBudgets);
    Alert.alert('Sucesso', 'Configurações financeiras atualizadas com sucesso!');
  };

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert('Sair', 'Deseja deslogar da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const totalIncome =
    (parseFloat(salary) || 0) +
    (parseFloat(vale) || 0) +
    (parseFloat(other) || 0);

  // ─── DB Panel ────────────────────────────────────────────────────────────────
  const [dbPanelOpen, setDbPanelOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<{ rows: any[]; error: string | null } | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  const tablesQuery = trpc.admin.getTables.useQuery(undefined, { enabled: dbPanelOpen });
  const tableDataQuery = trpc.admin.getTableData.useQuery(
    { table: selectedTable! },
    { enabled: !!selectedTable },
  );
  const execSQLMut = trpc.admin.executeSQL.useMutation();

  const handleExecSQL = async () => {
    if (!sqlQuery.trim()) return;
    setSqlRunning(true);
    setSqlResult(null);
    try {
      const result = await execSQLMut.mutateAsync({ query: sqlQuery });
      setSqlResult(result);
    } finally {
      setSqlRunning(false);
    }
  };

  return (
    <ScreenContainer className="p-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <Text className="text-3xl font-bold text-foreground">
          Configurações
        </Text>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
          style={{ padding: 4 }}
        >
          <MaterialIcons name="menu" size={28} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Hamburger dropdown menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: 60,
              right: 24,
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingVertical: 8,
              minWidth: 200,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {/* Dark mode row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialIcons
                  name={isDark ? 'dark-mode' : 'light-mode'}
                  size={20}
                  color={colors.foreground}
                />
                <Text style={{ color: colors.foreground, fontSize: 15 }}>
                  Modo escuro
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => setColorScheme(val ? 'dark' : 'light')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 8 }} />

            {/* Logout row */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <MaterialIcons name="logout" size={20} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '600' }}>
                Sair da conta
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Income and planning section */}
        <View className="bg-surface rounded-2xl p-6 mb-6">
          <Text className="text-xl font-bold text-foreground mb-4">
            Renda Mensal
          </Text>

          {/* Salary field */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Salário (R$)
            </Text>
            <TextInput
              className="bg-background border border-border rounded-lg p-3 text-foreground"
              placeholder="0.00"
              placeholderTextColor="#9BA1A6"
              value={salary}
              onChangeText={setSalary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Vale field */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Vale (R$)
            </Text>
            <TextInput
              className="bg-background border border-border rounded-lg p-3 text-foreground"
              placeholder="0.00"
              placeholderTextColor="#9BA1A6"
              value={vale}
              onChangeText={setVale}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Other income field */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Outros (R$)
            </Text>
            <TextInput
              className="bg-background border border-border rounded-lg p-3 text-foreground"
              placeholder="0.00"
              placeholderTextColor="#9BA1A6"
              value={other}
              onChangeText={setOther}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Total */}
          <View className="bg-primary/10 rounded-lg p-4 mb-6">
            <Text className="text-sm text-muted mb-1">Total de Renda</Text>
            <Text className="text-2xl font-bold text-primary">
              R$ {totalIncome.toFixed(2)}
            </Text>
          </View>

          {/* Monthly budget */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Orçamento mensal de despesas (R$)
            </Text>
            <TextInput
              className="bg-background border border-border rounded-lg p-3 text-foreground"
              placeholder="Ex: 2500.00"
              placeholderTextColor="#9BA1A6"
              value={monthlyBudget}
              onChangeText={setMonthlyBudget}
              keyboardType="decimal-pad"
            />
            <Text className="mt-1 text-xs text-muted">
              Valor máximo que você quer gastar neste mês.
            </Text>
          </View>

          {/* Category budgets (optional) */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-foreground mb-2">
              Orçamento por categoria (opcional)
            </Text>
            <Text className="text-xs text-muted mb-3">
              Preencha apenas as categorias que você quer controlar com um limite
              específico.
            </Text>

            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
              <View key={cat} className="mb-3">
                <Text className="text-xs font-medium text-foreground mb-1">
                  {CATEGORY_LABELS[cat]}
                </Text>
                <TextInput
                  className="bg-background border border-border rounded-lg p-3 text-foreground text-sm"
                  placeholder="0.00"
                  placeholderTextColor="#9BA1A6"
                  value={categoryBudgetInputs[cat]}
                  onChangeText={(text) =>
                    setCategoryBudgetInputs((prev) => ({
                      ...prev,
                      [cat]: text,
                    }))
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          {/* Save button */}
          <TouchableOpacity onPress={handleSave} activeOpacity={0.8}>
            <View className="bg-primary rounded-lg p-4 items-center">
              <Text className="text-background font-semibold text-base">
                Salvar
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ─── DB Panel ─────────────────────────────────────────── */}
        <View className="bg-surface rounded-2xl mb-8 overflow-hidden">
          <TouchableOpacity
            onPress={() => setDbPanelOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="storage" size={20} color={colors.foreground} />
                <Text className="text-base font-semibold text-foreground">Banco de Dados</Text>
              </View>
              <MaterialIcons
                name={dbPanelOpen ? 'expand-less' : 'expand-more'}
                size={22}
                color={colors.muted}
              />
            </View>
          </TouchableOpacity>

          {dbPanelOpen && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>

              {/* Tables list */}
              <View className="p-4">
                <Text className="text-xs font-semibold text-muted mb-2">TABELAS</Text>
                {tablesQuery.isLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {(tablesQuery.data ?? []).map((table) => (
                      <TouchableOpacity
                        key={table}
                        onPress={() => setSelectedTable(selectedTable === table ? null : table)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: selectedTable === table ? colors.primary : colors.border,
                            backgroundColor: selectedTable === table ? colors.primary + '20' : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              color: selectedTable === table ? colors.primary : colors.foreground,
                              fontFamily: 'monospace',
                            }}
                          >
                            {table}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Table data */}
              {selectedTable && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 16 }}>
                  <Text className="text-xs font-semibold text-muted mb-2">
                    {selectedTable.toUpperCase()} {tableDataQuery.isLoading ? '(carregando...)' : `(${tableDataQuery.data?.length ?? 0} linhas)`}
                  </Text>
                  {tableDataQuery.isLoading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View>
                        {/* Header */}
                        {(tableDataQuery.data ?? []).length > 0 && (
                          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                            {Object.keys(tableDataQuery.data![0]).map((col) => (
                              <Text
                                key={col}
                                style={{
                                  minWidth: 100,
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: colors.primary,
                                  fontFamily: 'monospace',
                                  paddingRight: 12,
                                }}
                              >
                                {col}
                              </Text>
                            ))}
                          </View>
                        )}
                        {/* Rows */}
                        {(tableDataQuery.data ?? []).map((row, i) => (
                          <View
                            key={i}
                            style={{
                              flexDirection: 'row',
                              paddingVertical: 3,
                              borderTopWidth: i > 0 ? 1 : 0,
                              borderTopColor: colors.border,
                            }}
                          >
                            {Object.values(row).map((val, j) => (
                              <Text
                                key={j}
                                style={{
                                  minWidth: 100,
                                  fontSize: 11,
                                  color: colors.foreground,
                                  fontFamily: 'monospace',
                                  paddingRight: 12,
                                }}
                                numberOfLines={1}
                              >
                                {val === null ? 'null' : String(val)}
                              </Text>
                            ))}
                          </View>
                        ))}
                        {(tableDataQuery.data ?? []).length === 0 && (
                          <Text style={{ color: colors.muted, fontSize: 12 }}>Sem dados</Text>
                        )}
                      </View>
                    </ScrollView>
                  )}
                </View>
              )}

              {/* SQL editor */}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 16 }}>
                <Text className="text-xs font-semibold text-muted mb-2">EXECUTAR SQL</Text>
                <TextInput
                  value={sqlQuery}
                  onChangeText={setSqlQuery}
                  multiline
                  numberOfLines={4}
                  placeholder="SELECT * FROM users;"
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 10,
                    color: colors.foreground,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    minHeight: 90,
                    textAlignVertical: 'top',
                  }}
                />
                <TouchableOpacity
                  onPress={handleExecSQL}
                  activeOpacity={0.8}
                  style={{ marginTop: 8 }}
                  disabled={sqlRunning}
                >
                  <View
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 8,
                      padding: 10,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6,
                      opacity: sqlRunning ? 0.7 : 1,
                    }}
                  >
                    {sqlRunning ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons name="play-arrow" size={18} color="#fff" />
                    )}
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                      Executar
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* SQL result */}
                {sqlResult && (
                  <View style={{ marginTop: 12 }}>
                    {sqlResult.error ? (
                      <View style={{ backgroundColor: colors.error + '20', borderRadius: 8, padding: 10 }}>
                        <Text style={{ color: colors.error, fontFamily: 'monospace', fontSize: 12 }}>
                          {sqlResult.error}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>
                          {sqlResult.rows.length} linha(s) retornada(s)
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator>
                          <View>
                            {sqlResult.rows.length > 0 && (
                              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                                {Object.keys(sqlResult.rows[0]).map((col) => (
                                  <Text
                                    key={col}
                                    style={{ minWidth: 90, fontSize: 11, fontWeight: '700', color: colors.primary, fontFamily: 'monospace', paddingRight: 10 }}
                                  >
                                    {col}
                                  </Text>
                                ))}
                              </View>
                            )}
                            {sqlResult.rows.map((row, i) => (
                              <View key={i} style={{ flexDirection: 'row', paddingVertical: 2 }}>
                                {Object.values(row).map((val, j) => (
                                  <Text
                                    key={j}
                                    style={{ minWidth: 90, fontSize: 11, color: colors.foreground, fontFamily: 'monospace', paddingRight: 10 }}
                                    numberOfLines={1}
                                  >
                                    {val === null ? 'null' : String(val)}
                                  </Text>
                                ))}
                              </View>
                            ))}
                            {sqlResult.rows.length === 0 && (
                              <Text style={{ color: colors.success, fontSize: 12 }}>Comando executado com sucesso</Text>
                            )}
                          </View>
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

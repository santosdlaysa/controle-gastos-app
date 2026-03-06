import { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useExpenses } from '@/hooks/use-expenses';
import { CATEGORY_LABELS, CATEGORY_COLORS, ExpenseCategory, Income } from '@/types/expense';
import { useAuthContext } from '@/lib/auth-context';
import { useThemeContext } from '@/lib/theme-provider';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const CATEGORY_ICONS: Record<ExpenseCategory, React.ComponentProps<typeof MaterialIcons>['name']> = {
  transporte: 'directions-car',
  alimentacao: 'restaurant',
  moradia: 'home',
  saude: 'local-hospital',
  educacao: 'school',
  lazer: 'sports-esports',
  outro: 'category',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#9BA1A6', marginBottom: 8, marginLeft: 4 }}>
      {label}
    </Text>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
    }}>
      {children}
    </View>
  );
}

function RowSeparator() {
  const colors = useColors();
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 56 }} />;
}

function InputRow({
  icon,
  iconColor,
  label,
  value,
  onChangeText,
  placeholder,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  iconColor: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, minHeight: 56 }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: iconColor + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <MaterialIcons name={icon} size={17} color={iconColor} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder ?? '0,00'}
        placeholderTextColor={colors.muted}
        style={{ fontSize: 15, color: colors.foreground, textAlign: 'right', minWidth: 90 }}
      />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const month = getCurrentMonth();
  const { income, budget, categoryBudgets, updateIncome, updateBudget, updateCategoryBudgets } = useExpenses(month);
  const { logout, user, applyLogin } = useAuthContext();
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors();
  const isDark = colorScheme === 'dark';

  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const updateNameMutation = trpc.profile.updateName.useMutation();

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === user?.name) return;
    setSavingName(true);
    try {
      await updateNameMutation.mutateAsync({ name: nameInput.trim() });
      await applyLogin({ ...user!, name: nameInput.trim() });
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o nome.');
    } finally {
      setSavingName(false);
    }
  };

  const [salary, setSalary] = useState('');
  const [vale, setVale] = useState('');
  const [other, setOther] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryBudgetInputs, setCategoryBudgetInputs] = useState<Record<ExpenseCategory, string>>({
    transporte: '', alimentacao: '', moradia: '', saude: '', educacao: '', lazer: '', outro: '',
  });

  useEffect(() => {
    setSalary(income.salary > 0 ? income.salary.toString() : '');
    setVale(income.vale > 0 ? income.vale.toString() : '');
    setOther(income.other > 0 ? income.other.toString() : '');
    setMonthlyBudget(budget > 0 ? budget.toString() : '');
    setCategoryBudgetInputs((prev) => {
      const updated = { ...prev };
      (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).forEach((cat) => {
        const value = categoryBudgets?.[cat];
        updated[cat] = value != null && value > 0 ? value.toString() : '';
      });
      return updated;
    });
  }, [income, budget, categoryBudgets]);

  const totalIncome = (parseFloat(salary) || 0) + (parseFloat(vale) || 0) + (parseFloat(other) || 0);

  const handleSave = async () => {
    const salaryNum = parseFloat(salary) || 0;
    const valeNum = parseFloat(vale) || 0;
    const otherNum = parseFloat(other) || 0;
    const budgetNum = parseFloat(monthlyBudget) || 0;

    if (salaryNum < 0 || valeNum < 0 || otherNum < 0 || budgetNum < 0) {
      Alert.alert('Erro', 'Os valores não podem ser negativos');
      return;
    }

    setSaving(true);
    try {
      await updateIncome({ salary: salaryNum, vale: valeNum, other: otherNum } as Income);
      await updateBudget(budgetNum);
      const catBudgets: Record<ExpenseCategory, number> = {} as Record<ExpenseCategory, number>;
      (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).forEach((cat) => {
        const num = parseFloat(categoryBudgetInputs[cat]);
        if (!isNaN(num) && num > 0) catBudgets[cat] = num;
      });
      await updateCategoryBudgets(catBudgets);
      Alert.alert('Salvo!', 'Configurações financeiras atualizadas.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja deslogar da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const deleteAccountMutation = trpc.profile.deleteAccount.useMutation();
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir conta',
      'Tem certeza? Todos os seus dados (despesas, renda, orçamentos e ganhos Uber) serão excluídos permanentemente. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmar exclusão',
              'Digite "EXCLUIR" para confirmar a exclusão permanente da sua conta.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim, excluir tudo',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      await deleteAccountMutation.mutateAsync();
                      await logout();
                    } catch {
                      Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const nameChanged = nameInput.trim() !== (user?.name ?? '');

  // avatar initials derived from current input
  const initials = nameInput.trim()
    ? nameInput.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  // ─── DB Panel ──────────────────────────────────────────────────────────────
  const [dbPanelOpen, setDbPanelOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<{ rows: unknown[]; error: string | null } | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  const tablesQuery = trpc.admin.getTables.useQuery(undefined, { enabled: dbPanelOpen });
  const tableDataQuery = trpc.admin.getTableData.useQuery({ table: selectedTable! }, { enabled: !!selectedTable });
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
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* ── Title ── */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground, marginBottom: 24, letterSpacing: -0.5 }}>
          Configurações
        </Text>

        {/* ── Conta ── */}
        <SectionLabel label="Conta" />
        <SettingCard>
          {/* User info + name edit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Seu nome"
                placeholderTextColor={colors.muted}
                style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, padding: 0 }}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              {user?.email ? (
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                  {user.email}
                </Text>
              ) : null}
            </View>
            {nameChanged && (
              <TouchableOpacity onPress={handleSaveName} disabled={savingName} activeOpacity={0.7}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
                  {savingName
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <MaterialIcons name="check" size={18} color="#fff" />
                  }
                </View>
              </TouchableOpacity>
            )}
          </View>

          <RowSeparator />

          {/* Dark mode */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#8B5CF620', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={17} color="#8B5CF6" />
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>Modo escuro</Text>
            <Switch
              value={isDark}
              onValueChange={(val) => setColorScheme(val ? 'dark' : 'light')}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor="#fff"
            />
          </View>

          <RowSeparator />

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialIcons name="logout" size={17} color="#EF4444" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: '#EF4444', fontWeight: '500' }}>Sair da conta</Text>
              <MaterialIcons name="chevron-right" size={20} color="#EF4444" style={{ opacity: 0.5 }} />
            </View>
          </TouchableOpacity>

          <RowSeparator />

          {/* Delete account */}
          <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.7} disabled={deletingAccount}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, opacity: deletingAccount ? 0.5 : 1 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                {deletingAccount
                  ? <ActivityIndicator size="small" color="#EF4444" />
                  : <MaterialIcons name="delete-forever" size={17} color="#EF4444" />
                }
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: '#EF4444', fontWeight: '500' }}>Excluir conta</Text>
              <MaterialIcons name="chevron-right" size={20} color="#EF4444" style={{ opacity: 0.5 }} />
            </View>
          </TouchableOpacity>
        </SettingCard>

        {/* ── Renda ── */}
        <SectionLabel label="Renda mensal" />
        <SettingCard>
          <InputRow icon="payments" iconColor="#22C55E" label="Salário" value={salary} onChangeText={setSalary} />
          <RowSeparator />
          <InputRow icon="account-balance-wallet" iconColor="#0a7ea4" label="Vale" value={vale} onChangeText={setVale} />
          <RowSeparator />
          <InputRow icon="add-circle-outline" iconColor="#F59E0B" label="Outros" value={other} onChangeText={setOther} />

          {totalIncome > 0 && (
            <>
              <RowSeparator />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>Total</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#22C55E' }}>
                  R$ {totalIncome.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </SettingCard>

        {/* ── Orçamento ── */}
        <SectionLabel label="Orçamento" />
        <SettingCard>
          <InputRow icon="pie-chart" iconColor="#0a7ea4" label="Limite mensal" value={monthlyBudget} onChangeText={setMonthlyBudget} placeholder="Ex: 3000,00" />

          <RowSeparator />

          {/* Collapsible category budgets */}
          <TouchableOpacity onPress={() => setCatOpen((v) => !v)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#6B728020', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialIcons name="tune" size={17} color="#6B7280" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>Limite por categoria</Text>
              <MaterialIcons name={catOpen ? 'expand-less' : 'expand-more'} size={22} color={colors.muted} />
            </View>
          </TouchableOpacity>

          {catOpen && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat, i, arr) => (
                <View key={cat}>
                  <InputRow
                    icon={CATEGORY_ICONS[cat]}
                    iconColor={CATEGORY_COLORS[cat]}
                    label={CATEGORY_LABELS[cat]}
                    value={categoryBudgetInputs[cat]}
                    onChangeText={(text) => setCategoryBudgetInputs((prev) => ({ ...prev, [cat]: text }))}
                  />
                  {i < arr.length - 1 && <RowSeparator />}
                </View>
              ))}
            </View>
          )}
        </SettingCard>

        {/* ── Save button ── */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85} disabled={saving}>
          <View style={{
            backgroundColor: colors.tint,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
            opacity: saving ? 0.7 : 1,
            marginBottom: 24,
          }}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <MaterialIcons name="check" size={20} color="#fff" />
            }
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── DB Panel ── */}
        <SectionLabel label="Administração" />
        <SettingCard>
          <TouchableOpacity onPress={() => setDbPanelOpen((v) => !v)} activeOpacity={0.8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MaterialIcons name="storage" size={17} color="#F59E0B" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: colors.foreground }}>Banco de Dados</Text>
              <MaterialIcons name={dbPanelOpen ? 'expand-less' : 'expand-more'} size={22} color={colors.muted} />
            </View>
          </TouchableOpacity>

          {dbPanelOpen && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              {/* Tables */}
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Tabelas</Text>
                {tablesQuery.isLoading ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {(tablesQuery.data ?? []).map((table) => (
                      <TouchableOpacity key={table} onPress={() => setSelectedTable(selectedTable === table ? null : table)} activeOpacity={0.7}>
                        <View style={{
                          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
                          borderColor: selectedTable === table ? colors.tint : colors.border,
                          backgroundColor: selectedTable === table ? colors.tint + '20' : 'transparent',
                        }}>
                          <Text style={{ fontSize: 12, color: selectedTable === table ? colors.tint : colors.foreground, fontFamily: 'monospace' }}>
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
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                    {selectedTable} {tableDataQuery.isLoading ? '…' : `(${tableDataQuery.data?.length ?? 0} linhas)`}
                  </Text>
                  {tableDataQuery.isLoading ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View>
                        {(tableDataQuery.data ?? []).length > 0 && (
                          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                            {Object.keys(tableDataQuery.data![0] as object).map((col) => (
                              <Text key={col} style={{ minWidth: 100, fontSize: 11, fontWeight: '700', color: colors.tint, fontFamily: 'monospace', paddingRight: 12 }}>
                                {col}
                              </Text>
                            ))}
                          </View>
                        )}
                        {(tableDataQuery.data ?? []).map((row, i) => (
                          <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border }}>
                            {Object.values(row as object).map((val, j) => (
                              <Text key={j} style={{ minWidth: 100, fontSize: 11, color: colors.foreground, fontFamily: 'monospace', paddingRight: 12 }} numberOfLines={1}>
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
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>SQL</Text>
                <TextInput
                  value={sqlQuery}
                  onChangeText={setSqlQuery}
                  multiline
                  numberOfLines={4}
                  placeholder="SELECT * FROM users;"
                  placeholderTextColor={colors.muted}
                  style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, color: colors.foreground, fontFamily: 'monospace', fontSize: 13, minHeight: 90, textAlignVertical: 'top' }}
                />
                <TouchableOpacity onPress={handleExecSQL} activeOpacity={0.8} style={{ marginTop: 8 }} disabled={sqlRunning}>
                  <View style={{ backgroundColor: colors.tint, borderRadius: 10, padding: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, opacity: sqlRunning ? 0.7 : 1 }}>
                    {sqlRunning ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="play-arrow" size={18} color="#fff" />}
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Executar</Text>
                  </View>
                </TouchableOpacity>

                {sqlResult && (
                  <View style={{ marginTop: 12 }}>
                    {sqlResult.error ? (
                      <View style={{ backgroundColor: colors.error + '20', borderRadius: 8, padding: 10 }}>
                        <Text style={{ color: colors.error, fontFamily: 'monospace', fontSize: 12 }}>{sqlResult.error}</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: colors.background, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>{(sqlResult.rows as unknown[]).length} linha(s)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator>
                          <View>
                            {(sqlResult.rows as unknown[]).length > 0 && (
                              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                                {Object.keys(sqlResult.rows[0] as object).map((col) => (
                                  <Text key={col} style={{ minWidth: 90, fontSize: 11, fontWeight: '700', color: colors.tint, fontFamily: 'monospace', paddingRight: 10 }}>{col}</Text>
                                ))}
                              </View>
                            )}
                            {(sqlResult.rows as unknown[]).map((row, i) => (
                              <View key={i} style={{ flexDirection: 'row', paddingVertical: 2 }}>
                                {Object.values(row as object).map((val, j) => (
                                  <Text key={j} style={{ minWidth: 90, fontSize: 11, color: colors.foreground, fontFamily: 'monospace', paddingRight: 10 }} numberOfLines={1}>
                                    {val === null ? 'null' : String(val)}
                                  </Text>
                                ))}
                              </View>
                            ))}
                            {(sqlResult.rows as unknown[]).length === 0 && (
                              <Text style={{ color: colors.success, fontSize: 12 }}>Executado com sucesso</Text>
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
        </SettingCard>

      </ScrollView>
    </ScreenContainer>
  );
}

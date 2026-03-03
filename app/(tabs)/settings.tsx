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
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useExpenses } from '@/hooks/use-expenses';
import { CATEGORY_LABELS, ExpenseCategory, Income } from '@/types/expense';
import { useAuthContext } from '@/lib/auth-context';
import { useThemeContext } from '@/lib/theme-provider';
import { useColors } from '@/hooks/use-colors';

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
      </ScrollView>
    </ScreenContainer>
  );
}

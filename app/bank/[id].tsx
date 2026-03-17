import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  TouchableOpacity, FlatList, TextInput, Alert, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { ScreenContainer } from '@/components/screen-container';
import { ExpenseItem } from '@/components/expense-item';
import { ExpenseModal } from '@/components/expense-modal';
import { useColors } from '@/hooks/use-colors';
import { useExpenses } from '@/hooks/use-expenses';
import { useCategories } from '@/hooks/use-categories';
import { trpc } from '@/lib/trpc';
import { Expense, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/expense';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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

const BANK_PALETTE = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6','#F97316','#06B6D4'];
function bankColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return BANK_PALETTE[Math.abs(h) % BANK_PALETTE.length];
}

const BANK_DOMAINS: Record<string, string> = {
  'nubank': 'nubank.com.br', 'itaú': 'itau.com.br', 'itau': 'itau.com.br',
  'bradesco': 'bradesco.com.br', 'santander': 'santander.com.br',
  'banco do brasil': 'bb.com.br', 'bb': 'bb.com.br',
  'caixa': 'caixa.gov.br', 'inter': 'inter.co',
  'c6': 'c6bank.com.br', 'c6bank': 'c6bank.com.br',
  'next': 'next.me', 'picpay': 'picpay.com',
  'sicoob': 'sicoob.com.br', 'sicredi': 'sicredi.com.br',
  'xp': 'xpi.com.br', 'btg': 'btgpactual.com',
  'neon': 'neon.com.br', 'mercado pago': 'mercadopago.com.br',
  'pagbank': 'pagbank.com.br', 'wise': 'wise.com',
};

function getBankDomain(name: string): string | null {
  const key = name.toLowerCase().trim();
  if (BANK_DOMAINS[key]) return BANK_DOMAINS[key];
  for (const k of Object.keys(BANK_DOMAINS)) {
    if (key.includes(k) || k.includes(key)) return BANK_DOMAINS[k];
  }
  return null;
}

function BankLogo({ name, size = 36 }: { name: string; size?: number }) {
  const domain = getBankDomain(name);
  const bc = bankColor(name);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const radius = size * 0.28;
  if (domain) {
    return (
      <Image
        source={{ uri: `https://www.google.com/s2/favicons?sz=64&domain=${domain}` }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="contain"
        placeholder={{ color: bc + '25' }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: bc + '25', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '800', color: bc }}>{initials}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BankDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const bankId = parseInt(id ?? '0', 10);

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'debit' | 'credit'>('debit');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [showOnlyInstallments, setShowOnlyInstallments] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [bankBalanceEditVisible, setBankBalanceEditVisible] = useState(false);
  const [bankBalanceInput, setBankBalanceInput] = useState('');
  const [bankReceivedInput, setBankReceivedInput] = useState('');
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  const { data: bank } = trpc.bank.getById.useQuery({ id: bankId }, { enabled: bankId > 0 });
  const bankUtils = trpc.useUtils();
  const updateBankLimits = trpc.bank.updateLimits.useMutation();

  const {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    moveExpenseToNextMonth,
    generateRemainingInstallments,
  } = useExpenses(currentMonth);

  const { colorMap, labelMap, iconMap } = useCategories();

  // Filter expenses for this bank + payment type + other filters
  const { filteredExpenses, filteredTotal, categoryTotals } = useMemo(() => {
    const bankExpenses = expenses.filter(e => e.bank === bank?.name && e.paymentType === paymentTypeFilter);
    const totals: Record<string, number> = {};
    for (const e of bankExpenses) {
      totals[e.category] = (totals[e.category] || 0) + e.value;
    }
    const filtered = bankExpenses.filter(e => {
      if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;
      if (showOnlyUnpaid && e.paid) return false;
      if (showOnlyInstallments && !e.quantity) return false;
      return true;
    });
    return {
      filteredExpenses: filtered,
      filteredTotal: filtered.reduce((s, e) => s + e.value, 0),
      categoryTotals: totals,
    };
  }, [expenses, bank?.name, paymentTypeFilter, selectedCategory, showOnlyUnpaid, showOnlyInstallments]);

  // Despesas deste banco sem paymentType
  const uncategorizedPayment = useMemo(
    () => expenses.filter(e => e.bank === bank?.name && !e.paymentType),
    [expenses, bank?.name]
  );
  const [uncategorizedModalVisible, setUncategorizedModalVisible] = useState(false);

  // Balance info
  const debitBalance = bank?.debitBalance != null ? parseFloat(String(bank.debitBalance)) : null;
  const creditLimit = bank?.creditLimit != null ? parseFloat(String(bank.creditLimit)) : null;
  const debitTotal = useMemo(() => expenses.filter(e => e.bank === bank?.name && e.paymentType === 'debit').reduce((s, e) => s + e.value, 0), [expenses, bank?.name]);
  const available = debitBalance != null ? debitBalance - debitTotal : null;

  const bc = bank ? bankColor(bank.name) : '#0a7ea4';

  // Active categories (only those with expenses)
  const activeCategories = useMemo(() => {
    return Object.keys(categoryTotals).filter(c => categoryTotals[c] > 0);
  }, [categoryTotals]);

  const handleAddExpense = useCallback(() => {
    setSelectedExpense(undefined);
    setModalVisible(true);
  }, []);

  const handleSaveExpense = useCallback(async (data: Omit<Expense, 'id' | 'date' | 'month'>) => {
    if (selectedExpense) {
      await updateExpense(selectedExpense.id, data);
    } else {
      await addExpense(data);
    }
  }, [selectedExpense, addExpense, updateExpense]);

  return (
    <ScreenContainer className="p-0">
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>

        {/* ─── HERO ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0c3a5e' }}>

          {/* Linha 1: voltar + logo + nome + mês */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 }}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}>
              <MaterialIcons name="arrow-back" size={24} color="rgba(255,255,255,0.9)" />
            </Pressable>
            {bank && <BankLogo name={bank.name} size={28} />}
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' }} numberOfLines={1}>
              {bank?.name ?? '...'}
            </Text>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, -1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-left" size={24} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
              {getMonthName(currentMonth)}
            </Text>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Linha 2: Toggle Déb/Créd + saldo */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3 }}>
              {(['debit', 'credit'] as const).map(type => (
                <Pressable key={type} onPress={() => { setPaymentTypeFilter(type); if (type === 'debit') setShowOnlyUnpaid(false); }} style={{ flex: 1 }}>
                  <View style={{ paddingVertical: 6, borderRadius: 10, alignItems: 'center', backgroundColor: paymentTypeFilter === type ? 'rgba(255,255,255,0.22)' : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: paymentTypeFilter === type ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                      {type === 'debit' ? 'Débito' : 'Crédito'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {/* Saldo/limite chip */}
            <Pressable
              onPress={() => {
                setBankBalanceInput(paymentTypeFilter === 'debit'
                  ? (debitBalance != null ? debitBalance.toFixed(2) : '')
                  : (creditLimit != null ? creditLimit.toFixed(2) : ''));
                setBankReceivedInput('');
                setBankBalanceEditVisible(true);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <MaterialIcons name="edit" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                  {paymentTypeFilter === 'debit'
                    ? (available != null ? `R$ ${fmt(available)} disp.` : 'Saldo')
                    : (creditLimit != null ? `R$ ${fmt(creditLimit)} limite` : 'Limite')}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Linha 3: métricas Renda/Despesas */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                {paymentTypeFilter === 'debit' ? 'Saldo' : 'Limite'}
              </Text>
              <Text style={{ color: '#93C5FD', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>
                {paymentTypeFilter === 'debit'
                  ? (available != null ? `R$ ${fmt(available)}` : '—')
                  : (creditLimit != null ? `R$ ${fmt(creditLimit)}` : '—')}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Despesas</Text>
              <Text style={{ color: '#FCA5A5', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>R$ {fmt(filteredTotal)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Itens</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: '800' }}>{filteredExpenses.length}</Text>
            </View>
          </View>
        </View>

        {/* ─── CONTENT ──────────────────────────────────── */}
        <View className="bg-background" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 }}>

          {/* Chips: filtros + categorias */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 14, paddingBottom: 4 }}
          >
            {paymentTypeFilter === 'credit' && (
              <Pressable onPress={() => setShowOnlyUnpaid(v => !v)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, backgroundColor: showOnlyUnpaid ? colors.success + '20' : 'transparent', borderColor: showOnlyUnpaid ? colors.success : colors.border }}>
                  {showOnlyUnpaid && <MaterialIcons name="check" size={11} color={colors.success} />}
                  <Text style={{ fontSize: 11, fontWeight: '600', color: showOnlyUnpaid ? colors.success : colors.foreground }}>Não pagas</Text>
                </View>
              </Pressable>
            )}
            <Pressable onPress={() => setShowOnlyInstallments(v => !v)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, backgroundColor: showOnlyInstallments ? colors.primary + '20' : 'transparent', borderColor: showOnlyInstallments ? colors.primary : colors.border }}>
                {showOnlyInstallments && <MaterialIcons name="check" size={11} color={colors.primary} />}
                <Text style={{ fontSize: 11, fontWeight: '600', color: showOnlyInstallments ? colors.primary : colors.foreground }}>Parcelas</Text>
              </View>
            </Pressable>
            {activeCategories.length > 0 && (
              <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 6 }} />
            )}
            <Pressable onPress={() => setSelectedCategory('all')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: selectedCategory === 'all' ? colors.primary : 'transparent', borderWidth: 1.5, borderColor: selectedCategory === 'all' ? colors.primary : colors.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedCategory === 'all' ? '#fff' : '#888' }} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: selectedCategory === 'all' ? '#fff' : colors.foreground }}>Todas</Text>
              </View>
            </Pressable>
            {activeCategories.map(cat => {
              const isSelected = selectedCategory === cat;
              const color = colorMap[cat] ?? CATEGORY_COLORS[cat] ?? '#6B7280';
              return (
                <Pressable key={cat} onPress={() => setSelectedCategory(prev => prev === cat ? 'all' : cat)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: isSelected ? 2 : 1.5, borderColor: isSelected ? color : colors.border, backgroundColor: isSelected ? color + '15' : 'transparent' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? color : colors.foreground }}>{labelMap[cat] ?? CATEGORY_LABELS[cat] ?? cat}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Banner: despesas sem débito/crédito */}
          {uncategorizedPayment.length > 0 && (
            <Pressable onPress={() => setUncategorizedModalVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginHorizontal: 16, marginTop: 8, marginBottom: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F59E0B', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 }}>
                <MaterialIcons name="warning" size={18} color="#fff" />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#fff' }}>
                  {uncategorizedPayment.length} {uncategorizedPayment.length === 1 ? 'despesa sem débito/crédito' : 'despesas sem débito/crédito'}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color="#fff" />
              </View>
            </Pressable>
          )}

          {/* Cabeçalho da lista */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>Despesas</Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>
                {filteredExpenses.length} {filteredExpenses.length === 1 ? 'item' : 'itens'}
              </Text>
            </View>
          </View>

          {/* Lista */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#0a7ea4" />
              </View>
            ) : filteredExpenses.length === 0 ? (
              <View style={{ borderRadius: 20, padding: 32, alignItems: 'center', backgroundColor: colors.surface }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MaterialIcons name={paymentTypeFilter === 'debit' ? 'account-balance-wallet' : 'credit-card'} size={28} color="#0a7ea4" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Nenhuma despesa</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4, textAlign: 'center' }}>
                  Sem despesas de {paymentTypeFilter === 'debit' ? 'débito' : 'crédito'} neste mês
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredExpenses}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <ExpenseItem
                    expense={item}
                    onPress={(exp) => { setSelectedExpense(exp); setModalVisible(true); }}
                    onTogglePaid={async (exp) => { await updateExpense(exp.id, { paid: !exp.paid }); }}
                    colorMap={colorMap}
                    labelMap={labelMap}
                    iconMap={iconMap}
                    hideBankLabel
                  />
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB menu overlay */}
      {fabMenuVisible && (
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setFabMenuVisible(false)} />
      )}
      {fabMenuVisible && (
        <View style={{ position: 'absolute', bottom: 84, right: 20, gap: 10, alignItems: 'flex-end' }}>
          {/* Opção: Atualizar saldo/limite */}
          <Pressable
            onPress={() => {
              setFabMenuVisible(false);
              setBankBalanceInput(paymentTypeFilter === 'debit'
                ? (debitBalance != null ? debitBalance.toFixed(2) : '')
                : (creditLimit != null ? creditLimit.toFixed(2) : ''));
              setBankReceivedInput('');
              setBankBalanceEditVisible(true);
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', gap: 10 }]}
          >
            <View style={{ backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {paymentTypeFilter === 'debit' ? 'Atualizar saldo' : 'Atualizar limite'}
              </Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#fff" />
            </View>
          </Pressable>

          {/* Opção: Nova despesa */}
          <Pressable
            onPress={() => { setFabMenuVisible(false); handleAddExpense(); }}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', gap: 10 }]}
          >
            <View style={{ backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Nova despesa</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}>
              <MaterialIcons name="add" size={22} color="#fff" />
            </View>
          </Pressable>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setFabMenuVisible(v => !v)}
        activeOpacity={0.8}
        style={{ position: 'absolute', bottom: 16, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}
      >
        <MaterialIcons name={fabMenuVisible ? 'close' : 'add'} size={26} color="#fff" />
      </TouchableOpacity>

      {/* Modal editar saldo/limite */}
      <Modal visible={bankBalanceEditVisible} transparent animationType="fade" onRequestClose={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }} onPress={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderRadius: 20, padding: 24, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {bank && <BankLogo name={bank.name} size={28} />}
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                {paymentTypeFilter === 'debit' ? 'Saldo da conta' : 'Limite do cartão'} — {bank?.name}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>
                {paymentTypeFilter === 'debit' ? 'Saldo base (R$)' : 'Limite total (R$)'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.surface }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.success }}>R$</Text>
                <TextInput
                  value={bankBalanceInput}
                  onChangeText={setBankBalanceInput}
                  keyboardType="decimal-pad"
                  style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.success, paddingVertical: 11 }}
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                  autoFocus
                />
              </View>
            </View>
            {paymentTypeFilter === 'debit' && (
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>Adicionar valor recebido (opcional)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.surface }}>
                  <MaterialIcons name="add-circle-outline" size={18} color={colors.tint} />
                  <TextInput
                    value={bankReceivedInput}
                    onChangeText={setBankReceivedInput}
                    keyboardType="decimal-pad"
                    style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.tint, paddingVertical: 11 }}
                    placeholder="0.00"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
            )}
            {(bankBalanceInput || bankReceivedInput) && (() => {
              const base = parseFloat(bankBalanceInput.replace(',', '.')) || 0;
              const received = parseFloat(bankReceivedInput.replace(',', '.')) || 0;
              const total = base + received;
              return received > 0 ? (
                <View style={{ backgroundColor: colors.tint + '15', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>R$ {fmt(base)} + R$ {fmt(received)}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.tint }}>= R$ {fmt(total)}</Text>
                </View>
              ) : null;
            })()}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.muted }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!bank) return;
                  const base = parseFloat(bankBalanceInput.replace(',', '.'));
                  const received = parseFloat(bankReceivedInput.replace(',', '.')) || 0;
                  if (isNaN(base) || base < 0) { Alert.alert('Valor inválido', 'Digite um valor válido.'); return; }
                  const total = base + received;
                  await updateBankLimits.mutateAsync({
                    id: bank.id!,
                    debitBalance: paymentTypeFilter === 'debit' ? total : undefined,
                    creditLimit: paymentTypeFilter === 'credit' ? total : undefined,
                  });
                  await bankUtils.bank.getAll.invalidate();
                  setBankReceivedInput('');
                  setBankBalanceEditVisible(false);
                }}
                style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.6 : 1, backgroundColor: colors.tint, borderRadius: 12, padding: 14, alignItems: 'center' }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal: despesas sem débito/crédito */}
      <Modal visible={uncategorizedModalVisible} transparent animationType="slide" onRequestClose={() => setUncategorizedModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setUncategorizedModalVisible(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '75%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="warning" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Sem débito/crédito</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>{uncategorizedPayment.length} {uncategorizedPayment.length === 1 ? 'despesa' : 'despesas'} sem tipo definido</Text>
              </View>
            </View>
            <ScrollView style={{ paddingHorizontal: 16, marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {uncategorizedPayment.map(exp => (
                <Pressable key={exp.id} onPress={() => { setUncategorizedModalVisible(false); setSelectedExpense(exp); setModalVisible(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{exp.name}</Text>
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{exp.category} · {exp.date ? new Date(exp.date).toLocaleDateString('pt-BR') : '—'}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>R$ {fmt(exp.value)}</Text>
                    <MaterialIcons name="edit" size={16} color={colors.muted} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ExpenseModal */}
      <ExpenseModal
        visible={modalVisible}
        expense={selectedExpense}
        defaultBank={bank?.name}
        defaultPaymentType={paymentTypeFilter}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveExpense}
        onDelete={async (id) => { await deleteExpense(id); }}
        onMoveToNextMonth={async (id) => { await moveExpenseToNextMonth(id); }}
        onGenerateRemainingInstallments={async (id) => { await generateRemainingInstallments(id); }}
      />
    </ScreenContainer>
  );
}

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ScrollView,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Share,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { ExpenseModal } from '@/components/expense-modal';
import { useExpenses } from '@/hooks/use-expenses';
import { useAuthContext } from '@/lib/auth-context';
import { CATEGORY_LABELS, CATEGORY_COLORS, Expense } from '@/types/expense';
import { trpc } from '@/lib/trpc';
import { setAppMode } from '@/lib/mode';
import { setFabListener } from '@/lib/fab-action';
import { getUberFeatureEnabled } from '@/lib/uber-feature';
import { Toast, useToast } from '@/components/toast';
import { AdBanner } from '@/components/ad-banner';
import { usePurchases } from '@/hooks/use-purchases';

const BANK_PALETTE = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6','#F97316','#06B6D4'];
function bankColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return BANK_PALETTE[Math.abs(h) % BANK_PALETTE.length];
}

const BANK_DOMAINS: Record<string, string> = {
  'nubank': 'nubank.com.br',
  'itaú': 'itau.com.br', 'itau': 'itau.com.br',
  'bradesco': 'bradesco.com.br',
  'santander': 'santander.com.br',
  'banco do brasil': 'bb.com.br', 'bb': 'bb.com.br',
  'caixa': 'caixa.gov.br', 'cef': 'caixa.gov.br',
  'inter': 'inter.co',
  'c6': 'c6bank.com.br', 'c6bank': 'c6bank.com.br',
  'next': 'next.me',
  'picpay': 'picpay.com',
  'sicoob': 'sicoob.com.br',
  'sicredi': 'sicredi.com.br',
  'xp': 'xpi.com.br',
  'btg': 'btgpactual.com', 'btg pactual': 'btgpactual.com',
  'neon': 'neon.com.br',
  'mercado pago': 'mercadopago.com.br', 'mercadopago': 'mercadopago.com.br',
  'pagbank': 'pagbank.com.br', 'pagseguro': 'pagbank.com.br',
  'wise': 'wise.com',
  'original': 'original.com.br',
  'sofisa': 'sofisa.com.br',
  'will': 'willbank.com.br', 'will bank': 'willbank.com.br',
  'iti': 'iti.com.br',
  'bs2': 'bs2.com',
  'ailos': 'ailos.coop',
  'avenue': 'avenue.us',
  'nomad': 'nomadglobal.com',
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

// ─── Helpers de exportação ────────────────────────────────────────────────────

const EXPENSE_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function fmt(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function expFormatDateBR(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch { return dateStr; }
}

type ExpRow = { name: string; category: string; value: string; date: string; month: string; quantity: string | null; paid: boolean };

function generateExpensesCSV(rows: ExpRow[], year: string): string {
  const today = new Date();
  const gen = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const lines: string[] = [];
  lines.push(`Relatório Anual de Despesas - ${year}`);
  lines.push(`Gerado em: ${gen}`);
  lines.push('');
  lines.push('Mês,Data,Descrição,Categoria,Parcela,Valor (R$),Pago');

  const sorted = [...rows].sort((a, b) =>
    a.month !== b.month ? a.month.localeCompare(b.month) : a.date.localeCompare(b.date)
  );

  const byMonth: Record<string, number> = {};
  let total = 0;
  for (const r of sorted) {
    const [, mn] = r.month.split('-');
    const mName = EXPENSE_MONTH_NAMES[parseInt(mn, 10) - 1] ?? r.month;
    const desc = `"${r.name.replace(/"/g, '""')}"`;
    const cat = CATEGORY_LABELS[r.category] ?? r.category;
    const v = parseFloat(r.value);
    byMonth[r.month] = (byMonth[r.month] ?? 0) + v;
    total += v;
    lines.push(`${mName}/${year},${expFormatDateBR(r.date)},${desc},${cat},${r.quantity ?? ''},${v.toFixed(2)},${r.paid ? 'Sim' : 'Não'}`);
  }

  lines.push('');
  lines.push('--- RESUMO MENSAL ---');
  lines.push('Mês,Total Despesas (R$)');
  for (const month of Object.keys(byMonth).sort()) {
    const [, mn] = month.split('-');
    const name = EXPENSE_MONTH_NAMES[parseInt(mn, 10) - 1] ?? month;
    lines.push(`${name}/${year},${byMonth[month].toFixed(2)}`);
  }
  lines.push('');
  lines.push(`Total Anual,${total.toFixed(2)}`);
  return lines.join('\n');
}

function generateExpensesHTML(rows: ExpRow[], year: string): string {
  const today = new Date();
  const gen = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const byMonth: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const v = parseFloat(r.value);
    byMonth[r.month] = (byMonth[r.month] ?? 0) + v;
    total += v;
  }

  const sorted = [...rows].sort((a, b) =>
    a.month !== b.month ? a.month.localeCompare(b.month) : a.date.localeCompare(b.date)
  );

  const monthRows = Object.keys(byMonth).sort().map(month => {
    const [, mn] = month.split('-');
    const name = EXPENSE_MONTH_NAMES[parseInt(mn, 10) - 1] ?? month;
    return `<tr><td>${name}</td><td style="text-align:right;font-weight:600">R$ ${byMonth[month].toFixed(2)}</td></tr>`;
  }).join('');

  const entryRows = sorted.map(r => {
    const [, mn] = r.month.split('-');
    const mName = EXPENSE_MONTH_NAMES[parseInt(mn, 10) - 1] ?? r.month;
    const cat = CATEGORY_LABELS[r.category] ?? r.category;
    const color = CATEGORY_COLORS[r.category] ?? '#6B7280';
    return `<tr><td>${mName}</td><td>${expFormatDateBR(r.date)}</td><td>${r.name.replace(/</g, '&lt;')}</td><td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px"></span>${cat}</td><td>${r.quantity ?? '—'}</td><td style="text-align:right">R$ ${parseFloat(r.value).toFixed(2)}</td><td style="text-align:center">${r.paid ? '✓' : '—'}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Despesas ${year}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px}
h1{font-size:20px;font-weight:700;margin-bottom:4px}.subtitle{color:#6B7280;font-size:11px;margin-bottom:20px}
.cards{display:flex;gap:12px;margin-bottom:20px}.card{flex:1;border-radius:8px;padding:14px;border:1px solid #e5e7eb}
.cw{background:#eff6ff;border-color:#bfdbfe}.clabel{font-size:10px;color:#6B7280;margin-bottom:4px}.cval{font-size:18px;font-weight:700}
h2{font-size:13px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #f3f4f6;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f3f4f6;padding:7px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb}
td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
.footer{margin-top:20px;font-size:10px;color:#9CA3AF;text-align:center}
@media print{body{padding:0}@page{margin:1.5cm}}
</style></head><body>
<h1>💰 Relatório Anual de Despesas — ${year}</h1>
<div class="subtitle">Gerado em ${gen} · ${rows.length} registro${rows.length !== 1 ? 's' : ''}</div>
<div class="cards">
  <div class="card cw"><div class="clabel">Total Anual</div><div class="cval" style="color:#0a7ea4">R$ ${total.toFixed(2)}</div></div>
  <div class="card"><div class="clabel">Registros</div><div class="cval">${rows.length}</div></div>
  <div class="card"><div class="clabel">Meses com dados</div><div class="cval">${Object.keys(byMonth).length}</div></div>
</div>
<h2>Resumo Mensal</h2>
<table><thead><tr><th>Mês</th><th style="text-align:right">Total Despesas</th></tr></thead><tbody>${monthRows}</tbody><tfoot><tr style="background:#f3f4f6"><td style="font-weight:700">Total Anual</td><td style="text-align:right;font-weight:700">R$ ${total.toFixed(2)}</td></tr></tfoot></table>
<h2>Registros Detalhados</h2>
<table><thead><tr><th>Mês</th><th>Data</th><th>Descrição</th><th>Categoria</th><th>Parcela</th><th style="text-align:right">Valor</th><th style="text-align:center">Pago</th></tr></thead><tbody>${entryRows}</tbody></table>
<div class="footer">Controle de Gastos — Relatório de Despesas ${year}</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
}

function expDownloadCSVWeb(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click();
  document.body.removeChild(link); URL.revokeObjectURL(url);
}

function expPrintPDFWeb(html: string) {
  const win = window.open('', '_blank');
  if (!win) { alert('Permita pop-ups para exportar PDF.'); return; }
  win.document.write(html); win.document.close();
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

function DebtorsShortcut() {
  const router = useRouter();
  const colors = useColors();
  const { data: debtors = [] } = trpc.debtor.getAll.useQuery();
  const totalOwed = debtors.reduce((sum, d) => sum + parseFloat(String(d.totalOwed)), 0);
  return (
    <Pressable onPress={() => router.navigate('/(tabs)/debtors')} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View style={{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
        <View style={{ height: 3, backgroundColor: '#EF4444' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="people" size={22} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>Devedores</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
              {debtors.length === 0 ? 'Nenhum devedor' : `${debtors.length} ${debtors.length === 1 ? 'devedor' : 'devedores'}`}
            </Text>
          </View>
          {totalOwed > 0 && (
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#EF4444' }}>R$ {totalOwed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          )}
          <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const currentMonth = getCurrentMonth();
  const { user, logout } = useAuthContext();
  const { isPremium } = usePurchases();
  const [menuVisible, setMenuVisible] = useState(false);
  const [uberEnabled, setUberEnabled] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(() => String(new Date().getFullYear()));
  const [exporting, setExporting] = useState(false);
  const [bankBalanceEditVisible, setBankBalanceEditVisible] = useState(false);
  const [bankBalanceInput, setBankBalanceInput] = useState('');
  const [bankReceivedInput, setBankReceivedInput] = useState('');
  const [bankBalanceTarget, setBankBalanceTarget] = useState<{ id: number; name: string; debitBalance: number | null; creditLimit: number | null } | null>(null);
  const [unbankedModalVisible, setUnbankedModalVisible] = useState(false);
  const [nextMonthModalVisible, setNextMonthModalVisible] = useState(false);
  const [editExpenseVisible, setEditExpenseVisible] = useState(false);
  const [addExpenseVisible, setAddExpenseVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const { toast, show: showToast } = useToast();

  // Drawer lateral
  const drawerWidth = Dimensions.get('window').width * 0.78;
  const drawerAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [drawerAnim, overlayAnim]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: -drawerWidth, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  }, [drawerAnim, overlayAnim, drawerWidth]);

  const handleLogout = useCallback(() => {
    closeDrawer();
    setTimeout(() => {
      Alert.alert('Sair', 'Deseja deslogar da sua conta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: logout },
      ]);
    }, 300);
  }, [closeDrawer, logout]);

  const [refreshing, setRefreshing] = useState(false);
  const { data: allBanks = [] } = trpc.bank.getAll.useQuery();
  const bankUtils = trpc.useUtils();
  const updateBankLimits = trpc.bank.updateLimits.useMutation();
  const reorderBanks = trpc.bank.reorder.useMutation();
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedBanks, setOrderedBanks] = useState<typeof allBanks>([]);
  const reorderModeRef = useRef(false);
  reorderModeRef.current = reorderMode;

  useEffect(() => {
    if (!reorderModeRef.current) {
      setOrderedBanks([...allBanks]);
    }
  }, [allBanks]);

  function moveBank(list: typeof allBanks, fromIdx: number, toIdx: number) {
    const next = [...list];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
  }

  async function saveOrder() {
    const payload = orderedBanks.map((b, i) => ({ id: b.id, position: i }));
    await reorderBanks.mutateAsync(payload);
    bankUtils.bank.getAll.invalidate();
    setReorderMode(false);
    showToast('Ordem salva!');
  }

  const { expenses, loading, addExpense, updateExpense, deleteExpense, moveExpenseToNextMonth, generateRemainingInstallments } = useExpenses(currentMonth);

  const nextMonth = useMemo(() => addMonths(currentMonth, 1), [currentMonth]);
  const { data: nextMonthExpenses = [] } = trpc.expense.getByMonth.useQuery({ month: nextMonth });
  const nextMonthTotal = useMemo(() => nextMonthExpenses.reduce((sum, e) => sum + parseFloat(String(e.value)), 0), [nextMonthExpenses]);
  const [editNextMonthVisible, setEditNextMonthVisible] = useState(false);
  const [selectedNextMonthExpense, setSelectedNextMonthExpense] = useState<Expense | undefined>();

  const expUtils = trpc.useUtils();
  const updateNextMonthExp = trpc.expense.update.useMutation({ onSuccess: () => expUtils.expense.getByMonth.invalidate({ month: nextMonth }) });
  const deleteNextMonthExp = trpc.expense.delete.useMutation({ onSuccess: () => expUtils.expense.getByMonth.invalidate({ month: nextMonth }) });
  const colors = useColors();

  const fetchExpYear = useCallback(async () => {
    const data = await expUtils.expense.getByYear.fetch({ year: exportYear });
    if (!data || data.length === 0) { alert(`Nenhuma despesa encontrada para ${exportYear}.`); return null; }
    return data as ExpRow[];
  }, [exportYear, expUtils]);

  const handleExportExpCSV = useCallback(async () => {
    setExporting(true);
    try {
      const data = await fetchExpYear();
      if (!data) return;
      const csv = generateExpensesCSV(data, exportYear);
      if (Platform.OS === 'web') { expDownloadCSVWeb(csv, `despesas-${exportYear}.csv`); }
      else { await Share.share({ message: csv, title: `despesas-${exportYear}.csv` }); }
      setShowExportModal(false);
    } catch { alert('Erro ao exportar. Tente novamente.'); }
    finally { setExporting(false); }
  }, [exportYear, fetchExpYear]);

  const handleExportExpPDF = useCallback(async () => {
    if (Platform.OS !== 'web') {
      alert('A exportação em PDF está disponível apenas na versão web.\n\nUse "Exportar CSV" para dispositivos móveis.');
      return;
    }
    setExporting(true);
    try {
      const data = await fetchExpYear();
      if (!data) return;
      expPrintPDFWeb(generateExpensesHTML(data, exportYear));
      setShowExportModal(false);
    } catch { alert('Erro ao exportar. Tente novamente.'); }
    finally { setExporting(false); }
  }, [exportYear, fetchExpYear]);

  useFocusEffect(useCallback(() => {
    getUberFeatureEnabled().then(setUberEnabled);
  }, []));

  // FAB central da navbar cria uma despesa direto (sem precisar abrir um banco antes)
  useFocusEffect(useCallback(() => {
    setFabListener(() => { setSelectedExpense(undefined); setAddExpenseVisible(true); });
    return () => setFabListener(null);
  }, []));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      bankUtils.bank.getAll.invalidate(),
      expUtils.expense.getByMonth.invalidate(),
    ]);

    setRefreshing(false);
  }, [bankUtils, expUtils]);

  const unbankedExpenses = useMemo(() => expenses.filter(e => !e.bank), [expenses]);

  const bankSummaries = useMemo(() => {
    const result: Record<string, { debitTotal: number; creditTotal: number }> = {};
    for (const exp of expenses) {
      if (!exp.bank) continue;
      if (!result[exp.bank]) result[exp.bank] = { debitTotal: 0, creditTotal: 0 };
      if (exp.paymentType === 'debit') result[exp.bank].debitTotal += exp.value;
      else if (exp.paymentType === 'credit') result[exp.bank].creditTotal += exp.value;
    }
    return result;
  }, [expenses]);

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.background }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} colors={[colors.tint]} />
        }
      >

        {/* HERO */}
        <View style={{ backgroundColor: '#0c3a5e', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 56 }}>
          {/* Avatar + saudação + nome + menu */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 19, fontWeight: '700', color: '#fff' }}>
                {user?.name ? user.name.trim()[0].toUpperCase() : '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500', letterSpacing: 0.2 }}>Bem-vindo de volta</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginTop: 1 }}>
                {user?.name ? user.name.split(' ')[0] : 'Usuário'}
              </Text>
            </View>
            <Pressable onPress={openDrawer} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="menu" size={22} color="rgba(255,255,255,0.95)" />
            </Pressable>
          </View>
        </View>

        {/* CONTENT */}
        <View className="bg-background" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, paddingTop: 24, paddingHorizontal: 20, paddingBottom: 100 }}>

          {/* Banner: despesas sem banco */}
          {unbankedExpenses.length > 0 && (
            <Pressable onPress={() => setUnbankedModalVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="payments" size={18} color="#0a7ea4" />
                </View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                  {unbankedExpenses.length} {unbankedExpenses.length === 1 ? 'despesa sem conta' : 'despesas sem conta'}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color={colors.muted} />
              </View>
            </Pressable>
          )}
          {loading ? (
            <ActivityIndicator color={colors.tint} style={{ marginTop: 40 }} />
          ) : allBanks.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 56, paddingHorizontal: 24, gap: 14 }}>
              <View style={{ width: 80, height: 80, borderRadius: 28, backgroundColor: '#0a7ea412', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="account-balance" size={38} color="#0a7ea4" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center', letterSpacing: -0.3 }}>Nenhuma conta cadastrada</Text>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20, maxWidth: 280 }}>Adicione uma conta ou cartão para visualizar seu painel financeiro.</Text>
              <Pressable onPress={() => router.navigate('/(tabs)/banks')} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0a7ea4', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 14, marginTop: 4 }]}>
                <MaterialIcons name="add" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Adicionar conta</Text>
              </Pressable>
            </View>
          ) : (() => {
            const banks = (orderedBanks.length > 0 ? orderedBanks : allBanks).filter(b => b.id != null);
            const creditCards = banks.filter(b => {
              const s = bankSummaries[b.name] ?? { debitTotal: 0, creditTotal: 0 };
              return b.isCredit || b.creditLimit != null || s.creditTotal > 0;
            });
            const accounts = banks.filter(b => {
              const s = bankSummaries[b.name] ?? { debitTotal: 0, creditTotal: 0 };
              return b.debitBalance != null || s.debitTotal > 0;
            });
            const totalAvailable = banks.reduce((sum, b) => {
              return sum + (b.debitBalance != null ? parseFloat(String(b.debitBalance)) : 0);
            }, 0);
            const faturaTotal = Object.values(bankSummaries).reduce((sum, s) => sum + s.creditTotal, 0);
            const quickActions: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; color: string; onPress: () => void }[] = [
              { icon: 'bar-chart', label: 'Histórico', color: '#6366F1', onPress: () => router.navigate('/(tabs)/history') },
              { icon: 'category', label: 'Categorias', color: '#F59E0B', onPress: () => router.navigate('/(tabs)/categories') },
              { icon: 'people', label: 'Devedores', color: '#EC4899', onPress: () => router.navigate('/(tabs)/debtors') },
              { icon: 'file-download', label: 'Exportar', color: '#10B981', onPress: () => setShowExportModal(true) },
            ];

            return (
              <View style={{ gap: 20 }}>

                {/* ── Resumo financeiro (destaque) ── */}
                <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 16, elevation: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Saldo disponível</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, fontSize: 34, fontWeight: '800', color: colors.foreground, letterSpacing: -1.2 }}>
                      R$ {fmt(totalAvailable)}
                    </Text>
                    <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
                      <MaterialIcons name="account-balance-wallet" size={24} color="#0a7ea4" />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 16 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>Faturas</Text>
                        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>R$ {fmt(faturaTotal)}</Text>
                      </View>
                    </View>
                    <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border }} />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0a7ea4' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 }}>Contas ativas</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{banks.length}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* ── Ações rápidas ── */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {quickActions.map((a) => (
                    <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1, alignItems: 'center', gap: 7, flex: 1 }]}>
                      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: a.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name={a.icon} size={24} color={a.color} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }}>{a.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* ── Ad Banner ── */}
                {!isPremium && <AdBanner />}

                {/* ── Próximo Mês ── */}
                {nextMonthExpenses.length > 0 && (
                  <Pressable onPress={() => setNextMonthModalVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                    <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Despesas do próximo mês</Text>
                        <Text style={{ fontSize: 10, color: colors.muted }}>{getMonthName(nextMonth)} · {nextMonthExpenses.length} {nextMonthExpenses.length === 1 ? 'despesa' : 'despesas'}</Text>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#EF4444', letterSpacing: -0.5, marginTop: 2 }}>
                          R$ {fmt(nextMonthTotal)}
                        </Text>
                      </View>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="calendar-today" size={22} color="#EF4444" />
                      </View>
                    </View>
                  </Pressable>
                )}

                {/* ── Cartões de Crédito ── */}
                {creditCards.length > 0 && (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Cartões de crédito</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {reorderMode ? (
                          <>
                            <Pressable onPress={saveOrder} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#10B981' }]}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Salvar</Text>
                            </Pressable>
                            <Pressable onPress={() => { setOrderedBanks([...allBanks]); setReorderMode(false); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.border }]}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>Cancelar</Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable onPress={() => setReorderMode(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                              <MaterialIcons name="swap-vert" size={18} color={colors.muted} />
                            </Pressable>
                            <Pressable onPress={() => router.navigate('/(tabs)/banks')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                              <MaterialIcons name="add" size={18} color={colors.muted} />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                    {creditCards.map((bank) => {
                      const s = bankSummaries[bank.name] ?? { debitTotal: 0, creditTotal: 0 };
                      const creditLimit = bank.creditLimit != null ? parseFloat(String(bank.creditLimit)) : null;
                      const usedPct = creditLimit != null && creditLimit > 0 ? Math.min(100, (s.creditTotal / creditLimit) * 100) : null;
                      const barColor = usedPct != null ? (usedPct >= 90 ? '#EF4444' : usedPct >= 70 ? '#F59E0B' : '#10B981') : '#10B981';
                      const bc = bankColor(bank.name);
                      const allIdx = orderedBanks.findIndex(b => b.id === bank.id);
                      return (
                        <View key={`cc-${bank.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: reorderMode ? 8 : 0 }}>
                          {reorderMode && (
                            <View style={{ gap: 4 }}>
                              <Pressable
                                onPress={() => { if (allIdx > 0) setOrderedBanks(moveBank(orderedBanks, allIdx, allIdx - 1)); }}
                                disabled={allIdx === 0}
                                style={({ pressed }) => [{ opacity: (pressed || allIdx === 0) ? 0.3 : 1, width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}
                              >
                                <MaterialIcons name="keyboard-arrow-up" size={20} color={colors.foreground} />
                              </Pressable>
                              <Pressable
                                onPress={() => { if (allIdx < orderedBanks.length - 1) setOrderedBanks(moveBank(orderedBanks, allIdx, allIdx + 1)); }}
                                disabled={allIdx === orderedBanks.length - 1}
                                style={({ pressed }) => [{ opacity: (pressed || allIdx === orderedBanks.length - 1) ? 0.3 : 1, width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}
                              >
                                <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.foreground} />
                              </Pressable>
                            </View>
                          )}
                          <Pressable style={{ flex: 1 }} onPress={() => !reorderMode && router.push(`/bank/${bank.id}`)}>
                            <View style={{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
                              <View style={{ height: 3, backgroundColor: bc }} />
                              <View style={{ padding: 16, gap: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                  <BankLogo name={bank.name} size={38} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{bank.name}</Text>
                                  </View>
                                  {!reorderMode && <MaterialIcons name="chevron-right" size={18} color={colors.muted} />}
                                </View>
                                <View style={{ flexDirection: 'row', gap: 0 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Fatura</Text>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: s.creditTotal > 0 ? '#EF4444' : colors.foreground }}>R$ {fmt(s.creditTotal)}</Text>
                                  </View>
                                  <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 2, marginHorizontal: 16 }} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Limite</Text>
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground }}>
                                      {creditLimit != null ? `R$ ${fmt(creditLimit)}` : '—'}
                                    </Text>
                                  </View>
                                </View>
                                {usedPct != null && (
                                  <View style={{ gap: 4 }}>
                                    <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
                                      <View style={{ height: 5, borderRadius: 3, backgroundColor: barColor, width: `${usedPct}%` }} />
                                    </View>
                                    <Text style={{ fontSize: 10, color: colors.muted }}>{usedPct.toFixed(0)}% do limite utilizado</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* ── Minhas Contas ── */}
                {accounts.length > 0 && (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Minhas contas</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {reorderMode ? (
                          <>
                            <Pressable onPress={saveOrder} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#10B981' }]}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Salvar</Text>
                            </Pressable>
                            <Pressable onPress={() => { setOrderedBanks([...allBanks]); setReorderMode(false); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.border }]}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>Cancelar</Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Pressable onPress={() => setReorderMode(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                              <MaterialIcons name="swap-vert" size={18} color={colors.muted} />
                            </Pressable>
                            <Pressable onPress={() => router.navigate('/(tabs)/banks')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                              <MaterialIcons name="add" size={18} color={colors.muted} />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                    {accounts.map((bank) => {
                      const debitBalance = bank.debitBalance != null ? parseFloat(String(bank.debitBalance)) : null;
                      const bc = bankColor(bank.name);
                      const allIdx = orderedBanks.findIndex(b => b.id === bank.id);
                      return (
                        <View key={`acc-${bank.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: reorderMode ? 8 : 0 }}>
                          {reorderMode && (
                            <View style={{ gap: 4 }}>
                              <Pressable
                                onPress={() => { if (allIdx > 0) setOrderedBanks(moveBank(orderedBanks, allIdx, allIdx - 1)); }}
                                disabled={allIdx === 0}
                                style={({ pressed }) => [{ opacity: (pressed || allIdx === 0) ? 0.3 : 1, width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}
                              >
                                <MaterialIcons name="keyboard-arrow-up" size={20} color={colors.foreground} />
                              </Pressable>
                              <Pressable
                                onPress={() => { if (allIdx < orderedBanks.length - 1) setOrderedBanks(moveBank(orderedBanks, allIdx, allIdx + 1)); }}
                                disabled={allIdx === orderedBanks.length - 1}
                                style={({ pressed }) => [{ opacity: (pressed || allIdx === orderedBanks.length - 1) ? 0.3 : 1, width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}
                              >
                                <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.foreground} />
                              </Pressable>
                            </View>
                          )}
                          <Pressable style={{ flex: 1 }} onPress={() => !reorderMode && router.push(`/bank/${bank.id}`)}>
                            <View style={{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}>
                              <View style={{ height: 3, backgroundColor: bc }} />
                              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
                                <BankLogo name={bank.name} size={38} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{bank.name}</Text>
                                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>Conta corrente</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                  {debitBalance != null ? (
                                    <Text style={{ fontSize: 16, fontWeight: '800', color: debitBalance >= 0 ? '#10B981' : '#EF4444' }}>R$ {fmt(debitBalance)}</Text>
                                  ) : (
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}>—</Text>
                                  )}
                                </View>
                                {!reorderMode && <MaterialIcons name="chevron-right" size={18} color={colors.muted} />}
                              </View>
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* ── Devedores ── */}
                <DebtorsShortcut />

              </View>
            );
          })()}
        </View>

        {!isPremium && <AdBanner />}
      </ScrollView>


      {/* Modal: despesas sem banco */}
      <Modal visible={unbankedModalVisible} transparent animationType="slide" onRequestClose={() => setUnbankedModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setUnbankedModalVisible(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '75%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="warning" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Sem conta atribuída</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>{unbankedExpenses.length} {unbankedExpenses.length === 1 ? 'despesa' : 'despesas'} neste mês</Text>
              </View>
            </View>
            <ScrollView style={{ paddingHorizontal: 16, marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {unbankedExpenses.map(exp => (
                <Pressable key={exp.id} onPress={() => { setSelectedExpense(exp); setUnbankedModalVisible(false); setEditExpenseVisible(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
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

      {/* Modal: despesas do próximo mês */}
      <Modal visible={nextMonthModalVisible} transparent animationType="slide" onRequestClose={() => setNextMonthModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setNextMonthModalVisible(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '80%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="calendar-today" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Despesas do próximo mês</Text>
                <Text style={{ fontSize: 12, color: colors.muted, textTransform: 'capitalize' }}>{getMonthName(nextMonth)} · {nextMonthExpenses.length} {nextMonthExpenses.length === 1 ? 'despesa' : 'despesas'}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#EF4444' }}>R$ {fmt(nextMonthTotal)}</Text>
            </View>
            <ScrollView style={{ paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const seen = new Set<string>();
                return [...nextMonthExpenses]
                  .sort((a, b) => parseFloat(String(b.value)) - parseFloat(String(a.value)))
                  .filter(exp => {
                    const key = `${exp.name}||${exp.quantity ?? ''}||${exp.bank ?? ''}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  })
                  .map(exp => {
                    const val = parseFloat(String(exp.value));
                    const asExpense: Expense = {
                      id: String(exp.id),
                      name: exp.name,
                      category: exp.category as Expense['category'],
                      value: val,
                      date: exp.date,
                      month: exp.month,
                      quantity: exp.quantity ?? undefined,
                      paid: exp.paid ?? undefined,
                      bank: exp.bank ?? null,
                      paymentType: (exp.paymentType as Expense['paymentType']) ?? null,
                      expenseType: (exp.expenseType as Expense['expenseType']) ?? null,
                    };
                    return (
                      <Pressable key={exp.id} onPress={() => { setSelectedNextMonthExpense(asExpense); setEditNextMonthVisible(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{exp.name}</Text>
                            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                              {CATEGORY_LABELS[exp.category] ?? exp.category}
                              {exp.bank ? ` · ${exp.bank}` : ''}
                              {exp.quantity ? ` · ${exp.quantity}` : ''}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#EF4444' }}>R$ {fmt(val)}</Text>
                          <MaterialIcons name="chevron-right" size={16} color={colors.muted} />
                        </View>
                      </Pressable>
                    );
                  });
              })()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ExpenseModal para editar despesas do próximo mês */}
      <ExpenseModal
        visible={editNextMonthVisible}
        expense={selectedNextMonthExpense}
        month={nextMonth}
        onClose={() => { setEditNextMonthVisible(false); setSelectedNextMonthExpense(undefined); }}
        onSave={async (data) => {
          if (selectedNextMonthExpense) {
            await updateNextMonthExp.mutateAsync({
              id: parseInt(selectedNextMonthExpense.id, 10),
              ...(data.name !== undefined && { name: data.name }),
              ...(data.category !== undefined && { category: data.category }),
              ...(data.value !== undefined && { value: data.value }),
              ...(data.date !== undefined && { date: data.date }),
              ...(data.quantity !== undefined && { quantity: data.quantity ?? null }),
              ...(data.paid !== undefined && { paid: data.paid }),
              ...('bank' in data && { bank: data.bank ?? null }),
              ...('paymentType' in data && { paymentType: data.paymentType ?? null }),
              ...('expenseType' in data && { expenseType: data.expenseType ?? null }),
            });
            showToast('Despesa atualizada!');
          }
        }}
        onDelete={async (id) => {
          await deleteNextMonthExp.mutateAsync({ id: parseInt(id, 10) });
          setEditNextMonthVisible(false);
          setSelectedNextMonthExpense(undefined);
          showToast('Despesa removida', 'info');
        }}
      />

      {/* ExpenseModal para editar despesas sem banco */}
      <ExpenseModal
        visible={editExpenseVisible}
        expense={selectedExpense}
        month={currentMonth}
        onClose={() => { setEditExpenseVisible(false); setSelectedExpense(undefined); }}
        onSave={async (data) => { if (selectedExpense) { await updateExpense(selectedExpense.id, data); showToast('Despesa atualizada!'); } }}
        onDelete={async (id) => { await deleteExpense(id); showToast('Despesa removida', 'info'); }}
        onMoveToNextMonth={async (id) => { await moveExpenseToNextMonth(id); showToast('Movida para o próximo mês!'); }}
        onGenerateRemainingInstallments={async (id) => { await generateRemainingInstallments(id); showToast('Parcelas geradas!'); }}
      />

      {/* ExpenseModal para criar despesa rápida (FAB) — banco/cartão opcional */}
      <ExpenseModal
        visible={addExpenseVisible}
        month={currentMonth}
        onClose={() => setAddExpenseVisible(false)}
        onSave={async (data) => { await addExpense(data); showToast('Despesa adicionada!'); }}
      />

      {/* Drawer lateral */}
      {menuVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          {/* Overlay */}
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayAnim }}>
            <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
          </Animated.View>

          {/* Drawer */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: drawerWidth,
              backgroundColor: colors.background,
              transform: [{ translateX: drawerAnim }],
              shadowColor: '#000',
              shadowOffset: { width: 4, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 20,
            }}
          >
            {/* Drawer header com perfil */}
            <View style={{ backgroundColor: '#0c3a5e', paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, gap: 16 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.3)' }}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>
                  {user?.name ? user.name.trim()[0].toUpperCase() : '?'}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff' }}>
                  {user?.name || 'Usuário'}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                  {user?.email || ''}
                </Text>
              </View>
            </View>

            {/* Menu items */}
            <ScrollView style={{ flex: 1, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Geral
              </Text>

              {/* Home */}
              <Pressable onPress={closeDrawer} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="home" size={21} color="#0a7ea4" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Início</Text>
                </View>
              </Pressable>

              {/* Categorias */}
              <Pressable onPress={() => { closeDrawer(); setTimeout(() => router.navigate('/(tabs)/categories'), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#F59E0B15', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="category" size={21} color="#F59E0B" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Categorias</Text>
                </View>
              </Pressable>

              {/* Histórico */}
              <Pressable onPress={() => { closeDrawer(); setTimeout(() => router.navigate('/(tabs)/history'), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#6366F115', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="bar-chart" size={21} color="#6366F1" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Histórico</Text>
                </View>
              </Pressable>

              {/* Bancos */}
              <Pressable onPress={() => { closeDrawer(); setTimeout(() => router.navigate('/(tabs)/banks'), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#3B82F615', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="account-balance" size={21} color="#3B82F6" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Bancos</Text>
                </View>
              </Pressable>

              {/* Assistente */}
              <Pressable onPress={() => { closeDrawer(); setTimeout(() => router.navigate('/(tabs)/assistant'), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#8B5CF615', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="smart-toy" size={21} color="#8B5CF6" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Assistente IA</Text>
                </View>
              </Pressable>

              {/* Uber */}
              {uberEnabled && (
                <Pressable onPress={() => { closeDrawer(); setTimeout(() => { setAppMode('uber'); router.replace('/(tabs)/uber-earnings'); }, 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#F59E0B15', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name="directions-car" size={21} color="#F59E0B" />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Ganhos de Uber</Text>
                  </View>
                </Pressable>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 24, marginVertical: 12 }} />

              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, paddingHorizontal: 24, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Ferramentas
              </Text>

              {/* Exportar */}
              <Pressable onPress={() => { closeDrawer(); setTimeout(() => setShowExportModal(true), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#10B98115', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="file-download" size={21} color="#10B981" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Exportar Relatório</Text>
                </View>
              </Pressable>

              {/* Configurações */}
              <Pressable onPress={() => { closeDrawer(); setTimeout(() => router.navigate('/(tabs)/settings'), 300); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 13 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#6B728015', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="settings" size={21} color="#6B7280" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Configurações</Text>
                </View>
              </Pressable>
            </ScrollView>

            {/* Footer: logout */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 16 }}>
              <Pressable onPress={handleLogout} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 8, paddingVertical: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="logout" size={21} color="#EF4444" />
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#EF4444' }}>Sair da conta</Text>
                </View>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Export modal */}
      <Modal visible={showExportModal} transparent animationType="fade" onRequestClose={() => setShowExportModal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowExportModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 24, marginHorizontal: 16, minWidth: 300 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <MaterialIcons name="file-download" size={22} color="#0a7ea4" />
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>Exportar Relatório Anual</Text>
              </View>
              <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>Selecione o ano para gerar o relatório de despesas pessoais.</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 20 }}>
                <Pressable onPress={() => setExportYear((y) => String(parseInt(y, 10) - 1))} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}>
                  <MaterialIcons name="chevron-left" size={28} color={colors.primary} />
                </Pressable>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{exportYear}</Text>
                <Pressable onPress={() => setExportYear((y) => String(parseInt(y, 10) + 1))} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}>
                  <MaterialIcons name="chevron-right" size={28} color={colors.primary} />
                </Pressable>
              </View>
              <View style={{ gap: 8, marginBottom: 12 }}>
                <Pressable onPress={handleExportExpCSV} disabled={exporting} style={({ pressed }) => [{ opacity: pressed || exporting ? 0.7 : 1 }]}>
                  <View style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                    {exporting ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="table-chart" size={16} color="#fff" />}
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{exporting ? 'Exportando...' : 'Exportar CSV'}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={handleExportExpPDF} disabled={exporting} style={({ pressed }) => [{ opacity: pressed || exporting ? 0.7 : 1 }]}>
                  <View style={{ borderRadius: 12, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.error + '10' }}>
                    <MaterialIcons name="picture-as-pdf" size={16} color={colors.error} />
                    <Text style={{ fontWeight: '600', fontSize: 14, color: colors.error }}>Exportar PDF</Text>
                  </View>
                </Pressable>
              </View>
              <Pressable onPress={() => setShowExportModal(false)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bank balance edit modal */}
      <Modal visible={bankBalanceEditVisible} transparent animationType="fade" onRequestClose={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }} onPress={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderRadius: 20, padding: 24, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {bankBalanceTarget && <BankLogo name={bankBalanceTarget.name} size={32} />}
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{bankBalanceTarget?.name}</Text>
            </View>

            {/* Saldo da conta */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>Saldo da conta (débito)</Text>
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

            {/* Received input */}
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

            {/* Preview */}
            {(bankBalanceInput || bankReceivedInput) && (() => {
              const base = parseFloat(bankBalanceInput.replace(',', '.')) || 0;
              const received = parseFloat(bankReceivedInput.replace(',', '.')) || 0;
              const total = base + received;
              return received > 0 ? (
                <View style={{ backgroundColor: colors.tint + '15', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.muted }}>R$ {fmt(base)} + R$ {fmt(received)}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.tint }}>= R$ {fmt(total)}</Text>
                </View>
              ) : null;
            })()}

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.muted }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const base = parseFloat(bankBalanceInput.replace(',', '.'));
                  const received = parseFloat(bankReceivedInput.replace(',', '.')) || 0;
                  if (isNaN(base) || base < 0) { Alert.alert('Valor inválido', 'Digite um saldo base válido.'); return; }
                  const total = base + received;
                  if (!bankBalanceTarget) return;
                  await updateBankLimits.mutateAsync({ id: bankBalanceTarget.id, debitBalance: total });
                  await bankUtils.bank.getAll.invalidate();
                  setBankReceivedInput('');
                  setBankBalanceEditVisible(false);
                  showToast('Saldo atualizado!');
                }}
                style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.6 : 1, backgroundColor: colors.tint, borderRadius: 12, padding: 14, alignItems: 'center' }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Toast {...toast} />
    </ScreenContainer>
  );
}

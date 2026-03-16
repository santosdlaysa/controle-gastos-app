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
  Modal,
  Share,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer } from '@/components/screen-container';
import { ExpenseItem } from '@/components/expense-item';
import { ExpenseModal } from '@/components/expense-modal';
import { useExpenses } from '@/hooks/use-expenses';
import { Expense, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/expense';
import { useCategories } from '@/hooks/use-categories';
import { trpc } from '@/lib/trpc';
import { setAppMode } from '@/lib/mode';
import { getSelectedBank, setSelectedBank } from '@/lib/selected-bank';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BANK_FILTER_KEY = 'home_bank_filter';

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

export default function HomeScreen() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [showOnlyInstallments, setShowOnlyInstallments] = useState(false);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'debit' | 'credit'>('debit');
  const [bankFilter, setBankFilterState] = useState<string | null>(null);
  const setBankFilter = useCallback((value: string | null) => {
    setBankFilterState(value);
    if (value) AsyncStorage.setItem(BANK_FILTER_KEY, value);
    else AsyncStorage.removeItem(BANK_FILTER_KEY);
  }, []);
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [bankBalanceEditVisible, setBankBalanceEditVisible] = useState(false);
  const [bankBalanceInput, setBankBalanceInput] = useState('');
  const [bankReceivedInput, setBankReceivedInput] = useState('');
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [uncategorizedSheetVisible, setUncategorizedSheetVisible] = useState(false);
  const [receivedModalVisible, setReceivedModalVisible] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDescription, setReceivedDescription] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(BANK_FILTER_KEY).then(v => { if (v) setBankFilterState(v); });
  }, []);

  const { data: allBanks = [] } = trpc.bank.getAll.useQuery();
  const bankUtils = trpc.useUtils();
  const updateBankLimits = trpc.bank.updateLimits.useMutation();

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
  const { categories, colorMap, labelMap, iconMap } = useCategories();
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(() => String(new Date().getFullYear()));
  const [exporting, setExporting] = useState(false);
  const expUtils = trpc.useUtils();

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
    filteredTotal,
    filteredBalance,
    isFiltered,
    budgetUsagePercent,
    bankIncome,
    uncategorizedExpenses,
  } = useMemo(() => {
    const totals: Record<string, number> = {};
    let unpaidCountAcc = 0;
    let unpaidTotalAcc = 0;

    for (const exp of expenses) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.value;

      if (!exp.paid && (exp.paymentType == null || exp.paymentType === paymentTypeFilter)) {
        unpaidCountAcc += 1;
        unpaidTotalAcc += exp.value;
      }
    }

    const percent =
      totalIncome > 0 ? Math.min(999, (totalExpenses / totalIncome) * 100) : 0;

    const budgetPercent =
      budget && budget > 0 ? Math.min(999, (totalExpenses / budget) * 100) : 0;

    const filtered = expenses.filter((exp) => {
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (showOnlyUnpaid && exp.paid) return false;
      if (showOnlyInstallments && !exp.quantity) return false;
      if (exp.paymentType != null && exp.paymentType !== paymentTypeFilter) return false;
      if (bankFilter && exp.bank !== bankFilter) return false;
      return true;
    });

    const isFiltered = selectedCategory !== 'all' || showOnlyUnpaid || showOnlyInstallments || !!bankFilter;
    const filteredTotal = isFiltered ? filtered.reduce((sum, e) => sum + e.value, 0) : totalExpenses;

    const uncategorized = expenses.filter((exp) => exp.paymentType == null);

    // Se banco selecionado, usa saldo/limite do banco como referência de renda
    let bankIncome: number | null = null;
    if (bankFilter) {
      const selectedBank = allBanks.find(b => b.name === bankFilter);
      if (selectedBank) {
        if (paymentTypeFilter === 'credit' && selectedBank.creditLimit != null) {
          bankIncome = parseFloat(String(selectedBank.creditLimit));
        } else if (paymentTypeFilter === 'debit' && selectedBank.debitBalance != null) {
          bankIncome = parseFloat(String(selectedBank.debitBalance));
        }
      }
    }

    const effectiveIncome = bankIncome !== null ? bankIncome : totalIncome;
    const filteredBalance = bankIncome !== null ? bankIncome : effectiveIncome - filteredTotal;

    return {
      categoryTotals: totals,
      unpaidCount: unpaidCountAcc,
      unpaidTotal: unpaidTotalAcc,
      percentOfIncome: percent,
      filteredExpenses: filtered,
      filteredTotal,
      filteredBalance,
      isFiltered,
      budgetUsagePercent: budgetPercent,
      bankIncome,
      uncategorizedExpenses: uncategorized,
    };
  }, [
    expenses,
    totalIncome,
    totalExpenses,
    selectedCategory,
    showOnlyUnpaid,
    showOnlyInstallments,
    paymentTypeFilter,
    bankFilter,
    budget,
    allBanks,
  ]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reload();
      const pending = getSelectedBank();
      if (pending) {
        setBankFilter(pending.name);
        setSelectedBank(null);
      }
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
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>

        {/* ─── HERO ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0c3a5e' }}>
          {/* Linha 1: menu + mês navegável + export */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
            <Pressable onPress={() => setMenuVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}>
              <MaterialIcons name="menu" size={24} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={handlePreviousMonth} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
                <MaterialIcons name="chevron-left" size={24} color="rgba(255,255,255,0.6)" />
              </Pressable>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', textTransform: 'capitalize', marginHorizontal: 4 }}>
                {getMonthName(currentMonth)}
              </Text>
              <Pressable onPress={handleNextMonth} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
                <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
            <Pressable onPress={() => setShowExportModal(true)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}>
              <MaterialIcons name="file-download" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          {/* Linha 2: Toggle Déb/Créd + Banco */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>
            <View style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3 }}>
              {(['debit', 'credit'] as const).map((type) => (
                <Pressable key={type} onPress={() => { setPaymentTypeFilter(type); if (type === 'debit') setShowOnlyUnpaid(false); }} style={{ flex: 1 }}>
                  <View style={{
                    paddingVertical: 6,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: paymentTypeFilter === type ? 'rgba(255,255,255,0.22)' : 'transparent',
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: paymentTypeFilter === type ? '#fff' : 'rgba(255,255,255,0.5)',
                    }}>
                      {type === 'debit' ? 'Débito' : 'Crédito'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {allBanks.length > 0 && (
              <Pressable onPress={() => setBankPickerVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: bankFilter ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)', backgroundColor: bankFilter ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                  <MaterialIcons name="account-balance" size={13} color={bankFilter ? '#fff' : 'rgba(255,255,255,0.55)'} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: bankFilter ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                    {bankFilter ?? 'Banco'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={14} color={bankFilter ? '#fff' : 'rgba(255,255,255,0.55)'} />
                </View>
              </Pressable>
            )}
          </View>

          {/* Linha 3: Saldo */}
          <Pressable
            onPress={bankFilter ? () => { setBankBalanceInput(bankIncome != null ? bankIncome.toFixed(2) : ''); setBankBalanceEditVisible(true); } : undefined}
            style={({ pressed }) => [{ alignItems: 'center', paddingVertical: 8, paddingHorizontal: 24, opacity: pressed && !!bankFilter ? 0.7 : 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {bankFilter ? 'Saldo Atual' : 'Saldo Restante'}
              </Text>
              {bankFilter && <MaterialIcons name="edit" size={11} color="rgba(255,255,255,0.4)" />}
            </View>
            <Text style={{ color: filteredBalance >= 0 ? '#93C5FD' : '#FCA5A5', fontSize: 34, fontWeight: '800', letterSpacing: -1.5, lineHeight: 40 }}>
              R$ {fmt(filteredBalance)}
            </Text>
          </Pressable>

          {/* Linha 4: 2 métricas */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 24, paddingTop: 10 }}>
            <Pressable onPress={handleStartEditIncome} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, alignItems: 'center' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Renda</Text>
                <MaterialIcons name="edit" size={10} color="rgba(255,255,255,0.35)" />
              </View>
              <Text style={{ color: '#93C5FD', fontSize: 15, fontWeight: '700', letterSpacing: -0.3 }}>R$ {fmt(totalIncome)}</Text>
            </Pressable>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 2 }} />
            <Pressable onPress={handleAddExpense} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, alignItems: 'center' }]}>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Despesas</Text>
              <Text style={{ color: '#FCA5A5', fontSize: 15, fontWeight: '700', letterSpacing: -0.3 }}>R$ {fmt(filteredTotal)}</Text>
            </Pressable>
          </View>
        </View>

        {/* ─── CONTENT ──────────────────────────────────── */}
        <View className="bg-background" style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20 }}>

          {/* Edição de renda (quando ativa) */}
          {editingIncome && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>Editar renda do mês</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.success }}>R$</Text>
                  <TextInput
                    ref={incomeInputRef}
                    value={incomeInput}
                    onChangeText={setIncomeInput}
                    onSubmitEditing={handleSaveIncome}
                    keyboardType="decimal-pad"
                    style={{ fontSize: 20, fontWeight: 'bold', color: colors.success, flex: 1 }}
                    placeholder="0.00"
                    placeholderTextColor={colors.muted}
                  />
                  <Pressable onPress={handleSaveIncome} hitSlop={8}>
                    <MaterialIcons name="check-circle" size={28} color={colors.success} />
                  </Pressable>
                  <Pressable onPress={() => setEditingIncome(false)} hitSlop={8}>
                    <MaterialIcons name="cancel" size={28} color={colors.muted} />
                  </Pressable>
                </View>
                {incomeOverride !== null && (
                  <Pressable onPress={handleClearIncomeOverride} style={{ marginTop: 8 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Restaurar padrão (R$ {fmt(income.salary + income.vale + income.other)})
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Orçamento mensal */}
          {budget > 0 && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <View style={{ borderRadius: 16, padding: 14, backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '30' }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 2 }}>
                  Uso do orçamento mensal (R$ {fmt(budget)})
                </Text>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
                  {budgetUsagePercent.toFixed(0)}% usado
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                  Gasto: R$ {fmt(totalExpenses)} · Restante: R$ {fmt(Math.max(budget - totalExpenses, 0))}
                </Text>
              </View>
            </View>
          )}

          {/* Indicadores rápidos */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.primary + '10', padding: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 2 }}>Uso da renda</Text>
              <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
                {totalIncome > 0 ? `${percentOfIncome.toFixed(0)}%` : '--'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>
                R$ {fmt(totalExpenses)} de R$ {fmt(totalIncome)}
              </Text>
            </View>
            {paymentTypeFilter === 'credit' ? (
              <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.warning + '22', padding: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 2 }}>Não pagas</Text>
                <Text style={{ color: colors.warning, fontSize: 18, fontWeight: '700' }}>{unpaidCount} itens</Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>Total: R$ {fmt(unpaidTotal)}</Text>
              </View>
            ) : (
              <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.primary + '10', padding: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 2 }}>Lançamentos</Text>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>{filteredExpenses.length} itens</Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>Total: R$ {fmt(filteredTotal)}</Text>
              </View>
            )}
          </View>

          {/* Notificação: despesas sem débito/crédito */}
          {uncategorizedExpenses.length > 0 && (
            <Pressable
              onPress={() => setUncategorizedSheetVisible(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginHorizontal: 16, marginTop: 12 }]}
            >
              <View style={{ backgroundColor: '#F59E0B15', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#F59E0B60', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F59E0B25', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="warning-amber" size={20} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#F59E0B' }}>
                    {uncategorizedExpenses.length} {uncategorizedExpenses.length === 1 ? 'despesa sem categoria' : 'despesas sem categoria'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>
                    Toque para classificar como débito ou crédito
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#F59E0B" />
              </View>
            </Pressable>
          )}

          {/* Preview categorias */}
          {categories.length > 0 && (() => {
            const sorted = categories
              .filter(c => (categoryTotals[c.name] || 0) > 0)
              .sort((a, b) => (categoryTotals[b.name] || 0) - (categoryTotals[a.name] || 0))
              .slice(0, 4);
            if (sorted.length === 0) return null;
            const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
            return (
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>Categorias</Text>
                  <Pressable onPress={() => router.navigate('/(tabs)/categories')} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
                    <Text style={{ fontSize: 13, color: colors.primary }}>Ver todas</Text>
                    <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {sorted.map((cat) => {
                    const spent = categoryTotals[cat.name] || 0;
                    const budget = categoryBudgets?.[cat.name] ?? 0;
                    const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                    const color = colorMap[cat.name] ?? '#6B7280';
                    const label = labelMap[cat.name] ?? cat.name;
                    const barColor = percent >= 100 ? '#EF4444' : percent >= 80 ? '#F59E0B' : '#22C55E';
                    return (
                      <Pressable
                        key={cat.name}
                        onPress={() => router.navigate('/(tabs)/categories')}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1, minWidth: '45%' }]}
                      >
                        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 8, borderLeftWidth: 3, borderLeftColor: color }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>{label}</Text>
                            <Text style={{ fontSize: 10, color: colors.muted }}>{total > 0 ? `${((spent / total) * 100).toFixed(0)}%` : '0%'}</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>R$ {fmt(spent)}</Text>
                          {budget > 0 && (
                            <View style={{ height: 2, borderRadius: 1, backgroundColor: '#E5E7EB', marginTop: 4, overflow: 'hidden' }}>
                              <View style={{ height: 2, borderRadius: 1, backgroundColor: barColor, width: `${percent}%` }} />
                            </View>
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* Filtros rápidos */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {paymentTypeFilter === 'credit' && (
              <Pressable onPress={() => setShowOnlyUnpaid((prev) => !prev)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, backgroundColor: showOnlyUnpaid ? colors.success + '20' : 'transparent', borderColor: showOnlyUnpaid ? colors.success : colors.border }}>
                  <Text style={{ fontSize: 12, color: showOnlyUnpaid ? colors.success : colors.foreground }}>Somente não pagas</Text>
                </View>
              </Pressable>
            )}
            <Pressable onPress={() => setShowOnlyInstallments((prev) => !prev)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, backgroundColor: showOnlyInstallments ? colors.primary + '20' : 'transparent', borderColor: showOnlyInstallments ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 12, color: showOnlyInstallments ? colors.primary : colors.foreground }}>Somente parcelas</Text>
              </View>
            </Pressable>
          </View>

          {/* Chips de categoria */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: -4 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 8, paddingBottom: 0 }}
          >
            <Pressable onPress={() => setSelectedCategory('all')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: selectedCategory === 'all' ? colors.primary : 'transparent', borderWidth: 1.5, borderColor: selectedCategory === 'all' ? colors.primary : colors.border }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedCategory === 'all' ? '#fff' : '#888' }} />
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: selectedCategory === 'all' ? '#fff' : colors.foreground }}>Todas</Text>
                  <Text style={{ fontSize: 10, color: selectedCategory === 'all' ? 'rgba(255,255,255,0.7)' : colors.muted }}>
                    {expenses.length} despesa{expenses.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </Pressable>
            {categories.map((catObj) => {
              const cat = catObj.name;
              const isSelected = selectedCategory === cat;
              const color = colorMap[cat] ?? CATEGORY_COLORS[cat] ?? '#6B7280';
              return (
                <Pressable key={cat} onPress={() => setSelectedCategory((prev) => prev === cat ? 'all' : cat)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: isSelected ? 2 : 1.5, borderColor: isSelected ? color : colors.border, backgroundColor: isSelected ? color + '15' : 'transparent' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? color : colors.foreground }}>{labelMap[cat] ?? CATEGORY_LABELS[cat] ?? cat}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Cabeçalho da lista */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
              Despesas
            </Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>
                {filteredExpenses.length}/{expenses.length}
              </Text>
            </View>
          </View>

          {/* Lista */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 80 }}>
            {loading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#0a7ea4" />
              </View>
            ) : expenses.length === 0 ? (
              <View style={{ borderRadius: 20, padding: 32, alignItems: 'center', backgroundColor: colors.surface }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MaterialIcons name="account-balance-wallet" size={32} color="#0a7ea4" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 4, color: colors.foreground }}>Nenhuma despesa este mês</Text>
                <Text style={{ fontSize: 13, textAlign: 'center', color: colors.muted }}>Toque no card de Despesas acima para adicionar</Text>
              </View>
            ) : filteredExpenses.length === 0 ? (
              <View style={{ borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: colors.surface }}>
                <Text style={{ fontSize: 13, textAlign: 'center', color: colors.muted }}>Nenhuma despesa com os filtros atuais.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredExpenses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ExpenseItem expense={item} onPress={handleEditExpense} onTogglePaid={handleTogglePaid} colorMap={colorMap} labelMap={labelMap} iconMap={iconMap} />
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB menu */}
      {fabMenuVisible && (
        <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setFabMenuVisible(false)} />
      )}
      {fabMenuVisible && (
        <View style={{ position: 'absolute', bottom: 84, right: 20, gap: 10, alignItems: 'flex-end' }}>
          <Pressable onPress={() => { setFabMenuVisible(false); setReceivedAmount(''); setReceivedDescription(''); setReceivedModalVisible(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <View style={{ backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Valor recebido</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}>
              <MaterialIcons name="arrow-downward" size={22} color="#fff" />
            </View>
          </Pressable>
          <Pressable onPress={() => { setFabMenuVisible(false); handleAddExpense(); }} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <View style={{ backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Despesa</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}>
              <MaterialIcons name="arrow-upward" size={22} color="#fff" />
            </View>
          </Pressable>
        </View>
      )}
      <TouchableOpacity
        onPress={() => setFabMenuVisible(v => !v)}
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
        <MaterialIcons name={fabMenuVisible ? 'close' : 'add'} size={26} color="#fff" />
      </TouchableOpacity>

      {/* Menu sanduíche */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setMenuVisible(false)}>
          <View style={{ position: 'absolute', top: 90, left: 16, backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', elevation: 8 }}>
            <Pressable onPress={() => { setMenuVisible(false); setAppMode('uber'); router.replace('/(tabs)/uber-earnings'); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
                <MaterialIcons name="directions-car" size={22} color="#0a7ea4" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Ganhos de Uber</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de exportação anual */}
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

      {/* Modal editar saldo/limite do banco */}
      <Modal visible={bankBalanceEditVisible} transparent animationType="fade" onRequestClose={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }} onPress={() => { setBankBalanceEditVisible(false); setBankReceivedInput(''); }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderRadius: 20, padding: 24, gap: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Saldo atual — {bankFilter}</Text>

            {/* Saldo base */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>Saldo base</Text>
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

            {/* Valor recebido */}
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
                  const bank = allBanks.find(b => b.name === bankFilter);
                  if (!bank) return;
                  await updateBankLimits.mutateAsync({
                    id: bank.id!,
                    creditLimit: paymentTypeFilter === 'credit' ? total : undefined,
                    debitBalance: paymentTypeFilter !== 'credit' ? total : undefined,
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

      {/* Modal seletor de banco */}
      <Modal visible={bankPickerVisible} transparent animationType="slide" onRequestClose={() => setBankPickerVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setBankPickerVisible(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, paddingHorizontal: 24, marginBottom: 12 }}>Selecionar banco</Text>
            {/* Todos */}
            <Pressable onPress={() => { setBankFilter(null); setBankPickerVisible(false); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: bankFilter === null ? colors.tint + '15' : 'transparent' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.tint + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="account-balance-wallet" size={18} color={colors.tint} />
                </View>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: bankFilter === null ? colors.tint : colors.text }}>Todos os bancos</Text>
                {bankFilter === null && <MaterialIcons name="check" size={20} color={colors.tint} />}
              </View>
            </Pressable>
            {allBanks.filter(b => b.id != null).map((b) => (
              <Pressable key={String(b.id)} onPress={() => { setBankFilter(b.name); setBankPickerVisible(false); }} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: bankFilter === b.name ? colors.tint + '15' : 'transparent' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.tint + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="credit-card" size={18} color={colors.tint} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: bankFilter === b.name ? colors.tint : colors.text }}>{b.name}</Text>
                  {bankFilter === b.name && <MaterialIcons name="check" size={20} color={colors.tint} />}
                </View>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal valor recebido */}
      <Modal visible={receivedModalVisible} transparent animationType="fade" onRequestClose={() => setReceivedModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }} onPress={() => setReceivedModalVisible(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderRadius: 20, padding: 24, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#22C55E20', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="arrow-downward" size={20} color="#22C55E" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Valor Recebido</Text>
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>Valor (R$)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.surface }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#22C55E' }}>R$</Text>
                <TextInput
                  value={receivedAmount}
                  onChangeText={setReceivedAmount}
                  keyboardType="decimal-pad"
                  style={{ flex: 1, fontSize: 20, fontWeight: '700', color: '#22C55E', paddingVertical: 12 }}
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                  autoFocus
                />
              </View>
            </View>

            <View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>Descrição (opcional)</Text>
              <TextInput
                value={receivedDescription}
                onChangeText={setReceivedDescription}
                style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text, backgroundColor: colors.surface }}
                placeholder="Ex: Salário, Pix recebido..."
                placeholderTextColor={colors.muted}
              />
            </View>

            {bankFilter && (
              <View style={{ backgroundColor: colors.tint + '12', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="account-balance" size={16} color={colors.tint} />
                <Text style={{ fontSize: 13, color: colors.tint, fontWeight: '600' }}>
                  Somará ao saldo de {bankFilter}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setReceivedModalVisible(false)} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.muted }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const val = parseFloat(receivedAmount.replace(',', '.'));
                  if (isNaN(val) || val <= 0) { Alert.alert('Valor inválido', 'Digite um valor maior que zero.'); return; }
                  if (bankFilter) {
                    const bank = allBanks.find(b => b.name === bankFilter);
                    if (bank) {
                      const current = paymentTypeFilter === 'credit'
                        ? (bank.creditLimit ? parseFloat(String(bank.creditLimit)) : 0)
                        : (bank.debitBalance ? parseFloat(String(bank.debitBalance)) : 0);
                      await updateBankLimits.mutateAsync({
                        id: bank.id!,
                        creditLimit: paymentTypeFilter === 'credit' ? current + val : undefined,
                        debitBalance: paymentTypeFilter !== 'credit' ? current + val : undefined,
                      });
                      await bankUtils.bank.getAll.invalidate();
                    }
                  }
                  setReceivedModalVisible(false);
                }}
                style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.6 : 1, backgroundColor: '#22C55E', borderRadius: 12, padding: 14, alignItems: 'center' }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Adicionar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal: despesas sem débito/crédito */}
      <Modal visible={uncategorizedSheetVisible} transparent animationType="slide" onRequestClose={() => setUncategorizedSheetVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={() => setUncategorizedSheetVisible(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '80%' }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 4 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F59E0B25', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="warning-amber" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>Sem categoria de pagamento</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>Toque em um item para editar e definir débito ou crédito</Text>
              </View>
            </View>
            <FlatList
              data={uncategorizedExpenses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
              renderItem={({ item }) => (
                <ExpenseItem
                  expense={item}
                  onPress={(exp) => {
                    setUncategorizedSheetVisible(false);
                    handleEditExpense(exp);
                  }}
                />
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

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

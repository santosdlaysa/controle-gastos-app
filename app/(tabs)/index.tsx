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
import { Expense, ExpenseCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/expense';
import { trpc } from '@/lib/trpc';
import { setAppMode } from '@/lib/mode';

// ─── Helpers de exportação ────────────────────────────────────────────────────

const EXPENSE_MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

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
    const cat = CATEGORY_LABELS[r.category as ExpenseCategory] ?? r.category;
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
    const cat = CATEGORY_LABELS[r.category as ExpenseCategory] ?? r.category;
    const color = CATEGORY_COLORS[r.category as ExpenseCategory] ?? '#6B7280';
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
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);
  const [showOnlyInstallments, setShowOnlyInstallments] = useState(false);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [bankFilter, setBankFilter] = useState<string | null>(null);

  const { data: allBanks = [] } = trpc.bank.getAll.useQuery();

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
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;
      if (showOnlyUnpaid && exp.paid) return false;
      if (showOnlyInstallments && !exp.quantity) return false;
      if (paymentTypeFilter !== 'all' && exp.paymentType != null && exp.paymentType !== paymentTypeFilter) return false;
      if (bankFilter && exp.bank !== bankFilter) return false;
      return true;
    });

    const isFiltered = paymentTypeFilter !== 'all' || selectedCategory !== 'all' || showOnlyUnpaid || showOnlyInstallments || !!bankFilter;
    const filteredTotal = isFiltered ? filtered.reduce((sum, e) => sum + e.value, 0) : totalExpenses;
    const filteredBalance = totalIncome - filteredTotal;

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
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>

        {/* ─── HERO ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0c3a5e' }}>
          {/* Toolbar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
            <Pressable onPress={() => setMenuVisible(true)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}>
              <MaterialIcons name="menu" size={24} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="account-balance-wallet" size={16} color="#fff" />
              </View>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>Despesas Pessoais</Text>
            </View>
            <Pressable onPress={() => setShowExportModal(true)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}>
              <MaterialIcons name="file-download" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          {/* Filtro por banco */}
          {allBanks.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingTop: 8, paddingBottom: 4 }}>
              <Pressable onPress={() => setBankFilter(null)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: bankFilter === null ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)', backgroundColor: bankFilter === null ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: bankFilter === null ? '#fff' : 'rgba(255,255,255,0.55)' }}>Todos os bancos</Text>
                </View>
              </Pressable>
              {allBanks.filter(b => b.id != null).map((b) => (
                <Pressable key={String(b.id)} onPress={() => setBankFilter(bankFilter === b.name ? null : b.name)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: bankFilter === b.name ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)', backgroundColor: bankFilter === b.name ? 'rgba(255,255,255,0.2)' : 'transparent' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: bankFilter === b.name ? '#fff' : 'rgba(255,255,255,0.55)' }}>{b.name}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* Toggle Débito / Crédito */}
          <View style={{ marginHorizontal: 20, marginTop: 8, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 3 }}>
              {(['all', 'debit', 'credit'] as const).map((type) => (
                <Pressable key={type} onPress={() => setPaymentTypeFilter(type)} style={{ flex: 1 }}>
                  <View style={{
                    paddingVertical: 7,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: paymentTypeFilter === type ? 'rgba(255,255,255,0.22)' : 'transparent',
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: paymentTypeFilter === type ? '#fff' : 'rgba(255,255,255,0.5)',
                    }}>
                      {type === 'all' ? 'Todos' : type === 'debit' ? 'Débito' : 'Crédito'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Month navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 8 }}>
            <Pressable onPress={handlePreviousMonth} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-left" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }}>
              {getMonthName(currentMonth)}
            </Text>
            <Pressable onPress={handleNextMonth} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-right" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Hero: Saldo Restante */}
          <View style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              {isFiltered ? 'Total Filtrado' : 'Saldo Restante'}
            </Text>
            <Text style={{ color: filteredBalance >= 0 ? '#93C5FD' : '#FCA5A5', fontSize: 46, fontWeight: '800', letterSpacing: -2, lineHeight: 54 }}>
              R$ {(isFiltered ? filteredTotal : filteredBalance).toFixed(2)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: filteredBalance >= 0 ? '#93C5FD' : '#FCA5A5' }} />
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                {isFiltered ? `${filteredExpenses.length} transaç${filteredExpenses.length === 1 ? 'ão' : 'ões'}` : filteredBalance >= 0 ? 'Dentro do orçamento' : 'Acima da renda'}
              </Text>
            </View>
          </View>

          {/* Cards: Renda + Despesas */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}>
            {/* Renda */}
            <Pressable onPress={handleStartEditIncome} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(147,197,253,0.25)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#93C5FD', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Renda</Text>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(147,197,253,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="edit" size={14} color="#93C5FD" />
                  </View>
                </View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>
                  R$ {totalIncome.toFixed(2)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>
                  {incomeOverride !== null ? 'personalizada · toque p/ editar' : 'toque para editar'}
                </Text>
              </View>
            </Pressable>
            {/* Despesas */}
            <Pressable onPress={handleAddExpense} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(252,165,165,0.25)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Despesas</Text>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(252,165,165,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="add" size={16} color="#FCA5A5" />
                  </View>
                </View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>
                  R$ {filteredTotal.toFixed(2)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>
                  {filteredExpenses.length} registro{filteredExpenses.length !== 1 ? 's' : ''} · toque p/ adicionar
                </Text>
              </View>
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
                      Restaurar padrão (R$ {(income.salary + income.vale + income.other).toFixed(2)})
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
                  Uso do orçamento mensal (R$ {budget.toFixed(2)})
                </Text>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>
                  {budgetUsagePercent.toFixed(0)}% usado
                </Text>
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                  Gasto: R$ {totalExpenses.toFixed(2)} · Restante: R$ {Math.max(budget - totalExpenses, 0).toFixed(2)}
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
                R$ {totalExpenses.toFixed(2)} de R$ {totalIncome.toFixed(2)}
              </Text>
            </View>
            <View style={{ flex: 1, borderRadius: 16, backgroundColor: colors.warning + '22', padding: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 2 }}>Não pagas</Text>
              <Text style={{ color: colors.warning, fontSize: 18, fontWeight: '700' }}>{unpaidCount} itens</Text>
              <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>Total: R$ {unpaidTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Filtros rápidos */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable onPress={() => setShowOnlyUnpaid((prev) => !prev)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, backgroundColor: showOnlyUnpaid ? colors.success + '20' : 'transparent', borderColor: showOnlyUnpaid ? colors.success : colors.border }}>
                <Text style={{ fontSize: 12, color: showOnlyUnpaid ? colors.success : colors.foreground }}>Somente não pagas</Text>
              </View>
            </Pressable>
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
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => {
              const total = categoryTotals[cat] || 0;
              const catBudget = categoryBudgets?.[cat];
              const catPercent = catBudget && catBudget > 0 ? Math.min(999, (total / catBudget) * 100) : null;
              const isSelected = selectedCategory === cat;
              const color = CATEGORY_COLORS[cat];
              return (
                <Pressable key={cat} onPress={() => setSelectedCategory((prev) => prev === cat ? 'all' : cat)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: isSelected ? 2 : 1.5, borderColor: isSelected ? color : colors.border, backgroundColor: isSelected ? color + '15' : 'transparent' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? color : colors.foreground }}>{CATEGORY_LABELS[cat]}</Text>
                      {catBudget && catBudget > 0 ? (
                        <Text style={{ fontSize: 10, color: colors.muted }}>R$ {total.toFixed(2)} de R$ {catBudget.toFixed(2)}{catPercent !== null ? ` (${catPercent.toFixed(0)}%)` : ''}</Text>
                      ) : (
                        <Text style={{ fontSize: 10, color: colors.muted }}>R$ {total.toFixed(2)}</Text>
                      )}
                    </View>
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
                  <ExpenseItem expense={item} onPress={handleEditExpense} onTogglePaid={handleTogglePaid} />
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
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
        <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>+</Text>
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

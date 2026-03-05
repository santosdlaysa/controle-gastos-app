import { useState, useCallback, useMemo } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Share,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';
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

// ─── Helpers de exportação ────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDateBR(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function generateAnnualCSV(
  rows: { description: string; category: string; entryType: string | null; value: string; date: string; month: string }[],
  year: string,
): string {
  const today = new Date();
  const generatedAt = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const lines: string[] = [];
  lines.push(`Relatório Anual Uber - ${year}`);
  lines.push(`Gerado em: ${generatedAt}`);
  lines.push('');
  lines.push('Mês,Data,Descrição,Categoria,Tipo,Valor (R$)');

  // Ordenar por mês e data
  const sorted = [...rows].sort((a, b) => {
    if (a.month !== b.month) return a.month.localeCompare(b.month);
    return a.date.localeCompare(b.date);
  });

  for (const r of sorted) {
    const [, monthNum] = r.month.split('-');
    const monthName = MONTH_NAMES[parseInt(monthNum, 10) - 1] ?? r.month;
    const desc = `"${r.description.replace(/"/g, '""')}"`;
    const catLabel = getCategoryLabel(r.category as UberCategory);
    const tipo = (r.entryType ?? 'ganho') === 'ganho' ? 'Ganho' : 'Gasto';
    lines.push(`${monthName}/${year},${formatDateBR(r.date)},${desc},${catLabel},${tipo},${parseFloat(r.value).toFixed(2)}`);
  }

  // Resumo mensal
  lines.push('');
  lines.push('--- RESUMO MENSAL ---');
  lines.push('Mês,Ganhos (R$),Gastos (R$),Lucro Líquido (R$)');

  const byMonth: Record<string, { ganhos: number; gastos: number }> = {};
  for (const r of rows) {
    if (!byMonth[r.month]) byMonth[r.month] = { ganhos: 0, gastos: 0 };
    const v = parseFloat(r.value);
    if ((r.entryType ?? 'ganho') === 'ganho') byMonth[r.month].ganhos += v;
    else byMonth[r.month].gastos += v;
  }

  let totalGanhos = 0;
  let totalGastos = 0;
  for (const month of Object.keys(byMonth).sort()) {
    const [, mn] = month.split('-');
    const name = MONTH_NAMES[parseInt(mn, 10) - 1] ?? month;
    const { ganhos, gastos } = byMonth[month];
    totalGanhos += ganhos;
    totalGastos += gastos;
    lines.push(`${name}/${year},${ganhos.toFixed(2)},${gastos.toFixed(2)},${(ganhos - gastos).toFixed(2)}`);
  }

  // Resumo anual
  lines.push('');
  lines.push('--- RESUMO ANUAL ---');
  lines.push(`Total Ganhos,${totalGanhos.toFixed(2)}`);
  lines.push(`Total Gastos,${totalGastos.toFixed(2)}`);
  lines.push(`Lucro Líquido,${(totalGanhos - totalGastos).toFixed(2)}`);

  return lines.join('\n');
}

function downloadCSVWeb(content: string, filename: string) {
  const BOM = '\uFEFF'; // UTF-8 BOM para Excel
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type ExportRow = { description: string; category: string; entryType: string | null; value: string; date: string; month: string };

function generateAnnualHTML(rows: ExportRow[], year: string): string {
  const today = new Date();
  const generatedAt = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const byMonth: Record<string, { ganhos: number; gastos: number }> = {};
  let totalGanhos = 0;
  let totalGastos = 0;
  for (const r of rows) {
    if (!byMonth[r.month]) byMonth[r.month] = { ganhos: 0, gastos: 0 };
    const v = parseFloat(r.value);
    if ((r.entryType ?? 'ganho') === 'ganho') { byMonth[r.month].ganhos += v; totalGanhos += v; }
    else { byMonth[r.month].gastos += v; totalGastos += v; }
  }
  const lucroLiquido = totalGanhos - totalGastos;
  const lucroColor = lucroLiquido >= 0 ? '#10B981' : '#EF4444';

  const sorted = [...rows].sort((a, b) =>
    a.month !== b.month ? a.month.localeCompare(b.month) : a.date.localeCompare(b.date)
  );

  const monthSummaryRows = Object.keys(byMonth).sort().map(month => {
    const [, mn] = month.split('-');
    const name = MONTH_NAMES[parseInt(mn, 10) - 1] ?? month;
    const { ganhos, gastos } = byMonth[month];
    const liq = ganhos - gastos;
    return `<tr><td>${name}</td><td class="green">R$ ${ganhos.toFixed(2)}</td><td class="red">R$ ${gastos.toFixed(2)}</td><td style="color:${liq >= 0 ? '#10B981' : '#EF4444'};font-weight:600">R$ ${liq.toFixed(2)}</td></tr>`;
  }).join('');

  const entryRows = sorted.map(r => {
    const [, mn] = r.month.split('-');
    const mName = MONTH_NAMES[parseInt(mn, 10) - 1] ?? r.month;
    const isGanho = (r.entryType ?? 'ganho') === 'ganho';
    const cat = getCategoryLabel(r.category as UberCategory);
    return `<tr><td>${mName}</td><td>${formatDateBR(r.date)}</td><td>${r.description.replace(/</g, '&lt;')}</td><td>${cat}</td><td class="${isGanho ? 'green' : 'red'}">${isGanho ? 'Ganho' : 'Gasto'}</td><td class="${isGanho ? 'green' : 'red'}" style="text-align:right">R$ ${parseFloat(r.value).toFixed(2)}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Uber ${year}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px}
h1{font-size:20px;font-weight:700;margin-bottom:4px}.subtitle{color:#6B7280;font-size:11px;margin-bottom:20px}
.cards{display:flex;gap:12px;margin-bottom:20px}.card{flex:1;border-radius:8px;padding:14px}
.cg{background:#f0fdf4;border:1px solid #bbf7d0}.cr{background:#fef2f2;border:1px solid #fecaca}.cn{border:1px solid #e5e7eb}
.clabel{font-size:10px;color:#6B7280;margin-bottom:4px}.cval{font-size:18px;font-weight:700}
.green{color:#10B981}.red{color:#EF4444}
h2{font-size:13px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #f3f4f6;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f3f4f6;padding:7px 10px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb}
td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
.footer{margin-top:20px;font-size:10px;color:#9CA3AF;text-align:center}
@media print{body{padding:0}@page{margin:1.5cm}}
</style></head><body>
<h1>🚗 Relatório Anual Uber — ${year}</h1>
<div class="subtitle">Gerado em ${generatedAt} · ${rows.length} registro${rows.length !== 1 ? 's' : ''}</div>
<div class="cards">
  <div class="card cg"><div class="clabel">Total Ganhos</div><div class="cval green">R$ ${totalGanhos.toFixed(2)}</div></div>
  <div class="card cr"><div class="clabel">Total Gastos</div><div class="cval red">R$ ${totalGastos.toFixed(2)}</div></div>
  <div class="card cn"><div class="clabel">Lucro Líquido</div><div class="cval" style="color:${lucroColor}">R$ ${lucroLiquido.toFixed(2)}</div></div>
</div>
<h2>Resumo Mensal</h2>
<table><thead><tr><th>Mês</th><th>Ganhos</th><th>Gastos</th><th>Lucro Líquido</th></tr></thead><tbody>${monthSummaryRows}</tbody></table>
<h2>Registros Detalhados</h2>
<table><thead><tr><th>Mês</th><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead><tbody>${entryRows}</tbody></table>
<div class="footer">Controle de Gastos — Relatório Uber ${year}</div>
<script>window.onload=function(){window.print();}</script>
</body></html>`;
}

function printPDFWeb(html: string) {
  const win = window.open('', '_blank');
  if (!win) { alert('Permita pop-ups para exportar PDF.'); return; }
  win.document.write(html);
  win.document.close();
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportYear, setExportYear] = useState(() => String(new Date().getFullYear()));
  const [exporting, setExporting] = useState(false);

  const utils = trpc.useUtils();

  const fetchExportData = useCallback(async () => {
    const data = await utils.uberEarnings.getByYear.fetch({ year: exportYear });
    if (!data || data.length === 0) {
      alert(`Nenhum registro encontrado para ${exportYear}.`);
      return null;
    }
    return data;
  }, [exportYear, utils]);

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const data = await fetchExportData();
      if (!data) return;
      const csv = generateAnnualCSV(data, exportYear);
      const filename = `uber-relatorio-${exportYear}.csv`;
      if (Platform.OS === 'web') {
        downloadCSVWeb(csv, filename);
      } else {
        await Share.share({ message: csv, title: filename });
      }
      setShowExportModal(false);
    } catch {
      alert('Erro ao exportar. Tente novamente.');
    } finally {
      setExporting(false);
    }
  }, [exportYear, fetchExportData]);

  const handleExportPDF = useCallback(async () => {
    if (Platform.OS !== 'web') {
      alert('A exportação em PDF está disponível apenas na versão web.\n\nUse "Exportar CSV" para dispositivos móveis.');
      return;
    }
    setExporting(true);
    try {
      const data = await fetchExportData();
      if (!data) return;
      const html = generateAnnualHTML(data, exportYear);
      printPDFWeb(html);
      setShowExportModal(false);
    } catch {
      alert('Erro ao exportar. Tente novamente.');
    } finally {
      setExporting(false);
    }
  }, [exportYear, fetchExportData]);

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
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <MaterialIcons name="menu" size={26} color={colors.foreground} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="directions-car" size={20} color="#10B981" />
            <Text className="text-lg font-bold text-foreground">Uber — Ganhos & Gastos</Text>
          </View>
          <Pressable
            onPress={() => setShowExportModal(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <MaterialIcons name="file-download" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Menu sanduíche modal */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
            onPress={() => setMenuVisible(false)}
          >
            <View
              style={{ position: 'absolute', top: 90, left: 16 }}
              className="bg-background rounded-2xl shadow-lg border border-border overflow-hidden"
            >
              <Pressable
                onPress={() => {
                  setMenuVisible(false);
                  router.replace('/(tabs)');
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View className="flex-row items-center gap-3 px-5 py-4">
                  <MaterialIcons name="account-balance-wallet" size={22} color="#0a7ea4" />
                  <Text className="text-base font-semibold text-foreground">Despesas Pessoais</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

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

      {/* Modal de exportação anual */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setShowExportModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              className="bg-surface rounded-2xl p-6 mx-4"
              style={{ minWidth: 300 }}
            >
              {/* Título */}
              <View className="flex-row items-center gap-2 mb-4">
                <MaterialIcons name="file-download" size={22} color="#10B981" />
                <Text className="text-lg font-bold text-foreground">Exportar Relatório Anual</Text>
              </View>

              <Text className="text-sm text-muted mb-4">
                Selecione o ano para gerar o CSV com todos os registros Uber.
              </Text>

              {/* Seletor de ano */}
              <View className="flex-row items-center justify-between bg-background rounded-xl p-3 mb-5">
                <Pressable
                  onPress={() => setExportYear((y) => String(parseInt(y, 10) - 1))}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
                >
                  <Text className="text-2xl text-primary">←</Text>
                </Pressable>
                <Text className="text-xl font-bold text-foreground">{exportYear}</Text>
                <Pressable
                  onPress={() => setExportYear((y) => String(parseInt(y, 10) + 1))}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
                >
                  <Text className="text-2xl text-primary">→</Text>
                </Pressable>
              </View>

              {/* Botões de exportação */}
              <View className="gap-2 mb-3">
                <Pressable
                  onPress={handleExportCSV}
                  disabled={exporting}
                  style={({ pressed }) => [{ opacity: pressed || exporting ? 0.7 : 1 }]}
                >
                  <View className="bg-primary rounded-xl p-3 items-center flex-row justify-center gap-2">
                    {exporting ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <MaterialIcons name="table-chart" size={16} color="#ffffff" />
                    )}
                    <Text className="text-white font-semibold text-sm">
                      {exporting ? 'Exportando...' : 'Exportar CSV'}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={handleExportPDF}
                  disabled={exporting}
                  style={({ pressed }) => [{ opacity: pressed || exporting ? 0.7 : 1 }]}
                >
                  <View
                    className="rounded-xl p-3 items-center flex-row justify-center gap-2 border"
                    style={{ borderColor: '#EF4444', backgroundColor: '#FEF2F2' }}
                  >
                    <MaterialIcons name="picture-as-pdf" size={16} color="#EF4444" />
                    <Text className="font-semibold text-sm" style={{ color: '#EF4444' }}>
                      Exportar PDF
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Cancelar */}
              <Pressable
                onPress={() => setShowExportModal(false)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                <View className="border border-border rounded-xl p-3 items-center">
                  <Text className="text-muted font-semibold text-sm">Cancelar</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

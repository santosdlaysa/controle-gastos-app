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
import { setAppMode } from '@/lib/mode';
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

  lines.push('');
  lines.push('--- RESUMO ANUAL ---');
  lines.push(`Total Ganhos,${totalGanhos.toFixed(2)}`);
  lines.push(`Total Gastos,${totalGastos.toFixed(2)}`);
  lines.push(`Lucro Líquido,${(totalGanhos - totalGastos).toFixed(2)}`);

  return lines.join('\n');
}

function downloadCSVWeb(content: string, filename: string) {
  const BOM = '\uFEFF';
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

  const filterCategories =
    activeTab === 'ganhos'
      ? UBER_EARNING_CATEGORIES
      : activeTab === 'gastos'
      ? UBER_EXPENSE_CATEGORIES
      : [...UBER_EARNING_CATEGORIES, ...UBER_EXPENSE_CATEGORIES];

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.background }}
      >
        {/* ─── HERO ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#0c3a5e' }}>

          {/* Toolbar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
            <Pressable
              onPress={() => setMenuVisible(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
            >
              <MaterialIcons name="menu" size={24} color="rgba(255,255,255,0.9)" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#0a7ea4', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="directions-car" size={16} color="#fff" />
              </View>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>
                Ganhos Uber
              </Text>
            </View>
            <Pressable
              onPress={() => setShowExportModal(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
            >
              <MaterialIcons name="file-download" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          {/* Month navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 8 }}>
            <Pressable
              onPress={() => setCurrentMonth(addMonths(currentMonth, -1))}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}
            >
              <MaterialIcons name="chevron-left" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }}>
              {getMonthName(currentMonth)}
            </Text>
            <Pressable
              onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}
            >
              <MaterialIcons name="chevron-right" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Lucro Líquido — número hero */}
          <View style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Lucro Líquido
            </Text>
            <Text style={{ color: netBalance >= 0 ? '#93C5FD' : '#FCA5A5', fontSize: 46, fontWeight: '800', letterSpacing: -2, lineHeight: 54 }}>
              R$ {netBalance.toFixed(2)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: netBalance >= 0 ? '#93C5FD' : '#FCA5A5' }} />
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                {netBalance >= 0 ? 'No lucro este mês' : 'Gastos maiores que ganhos'}
              </Text>
            </View>
          </View>

          {/* Ganhos + Gastos — cards clicáveis */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 28, gap: 10 }}>
            <Pressable
              onPress={() => handleOpenAdd('ganho')}
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(147,197,253,0.25)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#93C5FD', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Ganhos</Text>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(147,197,253,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="add" size={16} color="#93C5FD" />
                  </View>
                </View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>
                  R$ {totalEarnings.toFixed(2)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>
                  {earnings.length} registro{earnings.length !== 1 ? 's' : ''} · toque p/ adicionar
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => handleOpenAdd('gasto')}
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(252,165,165,0.25)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }}>Gastos</Text>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(252,165,165,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="add" size={16} color="#FCA5A5" />
                  </View>
                </View>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>
                  R$ {totalExpenses.toFixed(2)}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>
                  {expenses.length} registro{expenses.length !== 1 ? 's' : ''} · toque p/ adicionar
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ─── CONTENT ──────────────────────────────────── */}
        <View
          className="bg-background"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingTop: 0 }}
        >
          {/* Tabs */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', gap: 8 }}>
            {([
              { key: 'todos' as ActiveTab, label: 'Todos', count: entries.length },
              { key: 'ganhos' as ActiveTab, label: 'Ganhos', count: earnings.length },
              { key: 'gastos' as ActiveTab, label: 'Gastos', count: expenses.length },
            ]).map(({ key, label, count }) => {
              const isActive = activeTab === key;
              const color = key === 'ganhos' ? '#0a7ea4' : key === 'gastos' ? colors.error : colors.primary;
              return (
                <Pressable key={key} onPress={() => handleTabChange(key)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, backgroundColor: isActive ? color + '20' : 'transparent', borderColor: isActive ? color : colors.border }}>
                    <Text style={{ fontSize: 12, fontWeight: isActive ? '600' : '400', color: isActive ? color : colors.foreground }}>
                      {label} ({count})
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingTop: 8, paddingBottom: 0 }}
          >
            <Pressable
              onPress={() => setSelectedCategory('all')}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: selectedCategory === 'all' ? colors.primary : 'transparent', borderWidth: 1.5, borderColor: selectedCategory === 'all' ? colors.primary : colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCategory === 'all' ? '#fff' : colors.muted }}>
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
                  onPress={() => setSelectedCategory((prev) => (prev === cat ? 'all' : (cat as UberCategory)))}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: isSelected ? 2 : 1.5, borderColor: isSelected ? color : colors.border, backgroundColor: isSelected ? color + '15' : 'transparent' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected ? color : colors.foreground }}>
                        {getCategoryLabel(cat as UberCategory)}
                      </Text>
                      {total > 0 && (
                        <Text style={{ fontSize: 10, color: colors.muted }}>R$ {total.toFixed(2)}</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* List header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <Text className="text-foreground" style={{ fontSize: 15, fontWeight: '700' }}>
              {activeTab === 'ganhos' ? 'Ganhos' : activeTab === 'gastos' ? 'Gastos' : 'Todos os registros'}
            </Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: colors.border }}>
              <Text className="text-muted" style={{ fontSize: 11, fontWeight: '600' }}>
                {filteredEntries.length}/{listForTab.length}
              </Text>
            </View>
          </View>

          {/* List */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
            {loading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#0a7ea4" />
              </View>
            ) : listForTab.length === 0 ? (
              <View className="bg-surface" style={{ borderRadius: 20, padding: 32, alignItems: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#0a7ea415', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <MaterialIcons name="directions-car" size={32} color="#0a7ea4" />
                </View>
                <Text className="text-foreground" style={{ fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                  {activeTab === 'ganhos' ? 'Sem ganhos este mês' : activeTab === 'gastos' ? 'Sem gastos este mês' : 'Nenhum registro este mês'}
                </Text>
                <Text className="text-muted" style={{ fontSize: 13, textAlign: 'center' }}>
                  Toque nos cards de Ganhos ou Gastos acima para adicionar
                </Text>
              </View>
            ) : filteredEntries.length === 0 ? (
              <View className="bg-surface" style={{ borderRadius: 16, padding: 24, alignItems: 'center' }}>
                <Text className="text-muted" style={{ textAlign: 'center', fontSize: 13 }}>
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
        </View>
      </ScrollView>

      {/* Menu sanduíche */}
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
            style={{
              position: 'absolute',
              top: 90,
              left: 16,
              backgroundColor: colors.background,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Pressable
              onPress={() => {
                setMenuVisible(false);
                setAppMode('personal');
                router.replace('/(tabs)');
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 }}>
                <MaterialIcons name="account-balance-wallet" size={22} color="#0a7ea4" />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>Despesas Pessoais</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
              <View className="flex-row items-center gap-2 mb-4">
                <MaterialIcons name="file-download" size={22} color="#10B981" />
                <Text className="text-lg font-bold text-foreground">Exportar Relatório Anual</Text>
              </View>
              <Text className="text-sm text-muted mb-4">
                Selecione o ano para gerar o CSV com todos os registros Uber.
              </Text>
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

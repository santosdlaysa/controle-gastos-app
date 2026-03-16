import { useState, useMemo } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCategories } from '@/hooks/use-categories';
import { trpc } from '@/lib/trpc';
import { CATEGORY_COLORS } from '@/types/expense';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthName = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

const addMonths = (monthStr: string, delta: number) => {
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Donut chart ─────────────────────────────────────────────────────────────

interface DonutSlice {
  color: string;
  percent: number; // 0-1
}

function DonutChart({ slices, total, size = 220 }: { slices: DonutSlice[]; total: number; size?: number }) {
  const stroke = size * 0.18;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const gap = 0.012; // gap between slices as fraction of full circle

  let offset = 0;
  const arcs = slices.map((s) => {
    const len = Math.max(0, s.percent - gap) * circumference;
    const dashOffset = -offset * circumference;
    offset += s.percent;
    return { color: s.color, dashArray: `${len} ${circumference}`, dashOffset };
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${cx},${cy}`}>
          {arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
            />
          ))}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.5 }}>TOTAL</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>
          R$ {fmt(total)}
        </Text>
      </View>
    </View>
  );
}

// ─── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({
  icon,
  label,
  color,
  spent,
  budget,
  percent,
}: {
  icon: string;
  label: string;
  color: string;
  spent: number;
  budget: number | null;
  percent: number;
}) {
  const colors = useColors();
  const available = budget != null ? budget - spent : null;
  const barPercent = budget != null && budget > 0 ? Math.min(1, spent / budget) : percent;
  const barColor = barPercent >= 1 ? '#EF4444' : barPercent >= 0.8 ? '#F59E0B' : color;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: color,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: color + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <MaterialIcons
            name={(icon as React.ComponentProps<typeof MaterialIcons>['name']) ?? 'category'}
            size={18}
            color={color}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{label}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }}>
            {(percent * 100).toFixed(1)}% do total
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '700', color }}> R$ {fmt(spent)}</Text>
      </View>

      {/* Progress bar */}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color + '25', overflow: 'hidden' }}>
        <View
          style={{
            height: '100%',
            width: `${Math.min(100, barPercent * 100)}%`,
            borderRadius: 3,
            backgroundColor: barColor,
          }}
        />
      </View>

      {/* Budget info */}
      {budget != null && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>
            Orçamento: R$ {fmt(budget)}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: available! >= 0 ? '#22C55E' : '#EF4444' }}>
            {available! >= 0 ? `Disponível: R$ ${fmt(available!)}` : `Excedido: R$ ${fmt(Math.abs(available!))}`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const colors = useColors();
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const { categories, colorMap, labelMap, iconMap } = useCategories();

  const expensesQuery = trpc.expense.getByMonth.useQuery({ month: currentMonth });
  const budgetQuery = trpc.budget.get.useQuery({ month: currentMonth });

  const expenses = expensesQuery.data ?? [];
  const categoryBudgets: Record<string, number> = useMemo(() => {
    const rows = budgetQuery.data?.categoryBudgets ?? [];
    const result: Record<string, number> = {};
    for (const row of rows) result[row.category] = parseFloat(row.amount);
    return result;
  }, [budgetQuery.data]);

  const { totals, grandTotal } = useMemo(() => {
    const t: Record<string, number> = {};
    let grand = 0;
    for (const exp of expenses) {
      t[exp.category] = (t[exp.category] ?? 0) + parseFloat(String(exp.value));
      grand += parseFloat(String(exp.value));
    }
    return { totals: t, grandTotal: grand };
  }, [expenses]);

  // Sorted categories by spent desc, only those with spending
  const activeCategories = useMemo(() => {
    const cats = categories.filter((c) => (totals[c.name] ?? 0) > 0);
    cats.sort((a, b) => (totals[b.name] ?? 0) - (totals[a.name] ?? 0));
    return cats;
  }, [categories, totals]);

  // Include zero-spend categories that have a budget
  const zeroWithBudget = useMemo(
    () => categories.filter((c) => !(totals[c.name] ?? 0) && categoryBudgets[c.name]),
    [categories, totals, categoryBudgets],
  );

  const donutSlices = useMemo(
    () =>
      activeCategories.map((c) => ({
        color: colorMap[c.name] ?? CATEGORY_COLORS[c.name] ?? '#6B7280',
        percent: grandTotal > 0 ? (totals[c.name] ?? 0) / grandTotal : 0,
      })),
    [activeCategories, totals, grandTotal, colorMap],
  );

  const isCurrentMonth = currentMonth === getCurrentMonth();

  return (
    <ScreenContainer className="p-0">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.tint,
            paddingTop: 56,
            paddingBottom: 24,
            paddingHorizontal: 20,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>
            Categorias
          </Text>

          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, -1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-left" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }}>
              {getMonthName(currentMonth)}
            </Text>
            <Pressable onPress={() => !isCurrentMonth && setCurrentMonth(addMonths(currentMonth, 1))} style={({ pressed }) => [{ opacity: isCurrentMonth ? 0.3 : pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-right" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Donut */}
          {grandTotal > 0 ? (
            <DonutChart slices={donutSlices} total={grandTotal} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Nenhuma despesa neste mês</Text>
            </View>
          )}
        </View>

        {/* Category list */}
        <View style={{ padding: 16 }}>
          {[...activeCategories, ...zeroWithBudget].map((cat) => {
            const spent = totals[cat.name] ?? 0;
            const budget = categoryBudgets[cat.name] ?? null;
            const color = colorMap[cat.name] ?? CATEGORY_COLORS[cat.name] ?? '#6B7280';
            const percent = grandTotal > 0 ? spent / grandTotal : 0;
            return (
              <CategoryRow
                key={cat.name}
                icon={iconMap[cat.name] ?? 'category'}
                label={labelMap[cat.name] ?? cat.name}
                color={color}
                spent={spent}
                budget={budget}
                percent={percent}
              />
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

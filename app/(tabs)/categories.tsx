import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useExpenses } from '@/hooks/use-expenses';
import { useCategories } from '@/hooks/use-categories';
import { CategoryEditModal } from '@/components/category-edit-modal';
import { UserCategory } from '@/types/expense';

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthName(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Donut chart ────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 360) endDeg = startDeg + 359.99;
  const oS = polarToCartesian(cx, cy, outerR, startDeg);
  const oE = polarToCartesian(cx, cy, outerR, endDeg);
  const iS = polarToCartesian(cx, cy, innerR, startDeg);
  const iE = polarToCartesian(cx, cy, innerR, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${oS.x} ${oS.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oE.x} ${oE.y}`,
    `L ${iE.x} ${iE.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${iS.x} ${iS.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({ slices, total, size = 200 }: {
  slices: { color: string; value: number }[];
  total: number;
  size?: number;
}) {
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.62;
  const GAP = 2; // degrees gap between slices

  if (total === 0) {
    return (
      <Svg width={size} height={size}>
        <Path
          d={donutSlicePath(cx, cy, outerR, innerR, 0, 359.99)}
          fill="#E5E7EB"
        />
      </Svg>
    );
  }

  let current = 0;
  const paths: { path: string; color: string }[] = [];

  slices.forEach(({ value, color }) => {
    const sweep = (value / total) * 360;
    if (sweep < 0.5) { current += sweep; return; }
    const halfGap = slices.length > 1 ? GAP / 2 : 0;
    const start = current + halfGap;
    const end = current + sweep - halfGap;
    paths.push({ path: donutSlicePath(cx, cy, outerR, innerR, start, end), color });
    current += sweep;
  });

  return (
    <Svg width={size} height={size}>
      {paths.map((p, i) => (
        <Path key={i} d={p.path} fill={p.color} />
      ))}
    </Svg>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number; color: string }) {
  const barColor = percent >= 100 ? '#EF4444' : percent >= 80 ? '#F59E0B' : '#22C55E';
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginTop: 6, overflow: 'hidden' }}>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: barColor, width: `${Math.min(percent, 100)}%` }} />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  transporte: 'directions-car', alimentacao: 'restaurant', moradia: 'home',
  saude: 'local-hospital', educacao: 'school', lazer: 'sports-esports', outro: 'category',
};

export default function CategoriesScreen() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null);
  const colors = useColors();
  const { expenses, categoryBudgets, loading } = useExpenses(currentMonth);
  const { categories, colorMap, labelMap, iconMap, updateCategory } = useCategories();

  const { totals, totalSpent, sorted } = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const exp of expenses) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.value;
    }
    const totalSpent = Object.values(totals).reduce((s, v) => s + v, 0);

    // categories with spending, sorted desc
    const withSpending = categories
      .filter(c => (totals[c.name] || 0) > 0)
      .sort((a, b) => (totals[b.name] || 0) - (totals[a.name] || 0));

    // categories with budget but no spending
    const withBudgetOnly = categories.filter(c =>
      !(totals[c.name] || 0) && categoryBudgets?.[c.name] && categoryBudgets[c.name]! > 0
    );

    return { totals, totalSpent, sorted: [...withSpending, ...withBudgetOnly] };
  }, [expenses, categories, categoryBudgets]);

  const donutSlices = sorted
    .filter(c => (totals[c.name] || 0) > 0)
    .map(c => ({ color: colorMap[c.name] ?? '#6B7280', value: totals[c.name] || 0 }));

  return (
    <ScreenContainer className="p-0">
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: colors.background }}>

        {/* Header */}
        <View style={{ backgroundColor: '#0c3a5e', paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: '700', paddingHorizontal: 20, marginBottom: 16 }}>Categorias</Text>

          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28 }}>
            <Pressable onPress={() => setCurrentMonth(m => addMonths(m, -1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-left" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }}>
              {getMonthName(currentMonth)}
            </Text>
            <Pressable onPress={() => setCurrentMonth(m => addMonths(m, 1))} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
              <MaterialIcons name="chevron-right" size={30} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>

          {/* Donut */}
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 4 }}>
            <View style={{ position: 'relative', width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
              <DonutChart slices={donutSlices} total={totalSpent} size={200} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }}>R$ {fmt(totalSpent)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* List */}
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -20, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 }}>
          {loading ? (
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 32 }}>Carregando...</Text>
          ) : sorted.length === 0 ? (
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 32 }}>Nenhuma despesa neste mês</Text>
          ) : (
            sorted.map((cat) => {
              const spent = totals[cat.name] || 0;
              const budget = categoryBudgets?.[cat.name] ?? 0;
              const percent = budget > 0 ? (spent / budget) * 100 : 0;
              const color = colorMap[cat.name] ?? '#6B7280';
              const label = labelMap[cat.name] ?? cat.name;
              const icon = (iconMap[cat.name] ?? CATEGORY_ICONS[cat.name] ?? 'category') as React.ComponentProps<typeof MaterialIcons>['name'];
              const pctOfTotal = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;
              const available = budget > 0 ? budget - spent : null;

              return (
                <View
                  key={cat.name}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 10,
                    borderLeftWidth: 4,
                    borderLeftColor: color,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Icon */}
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name={icon} size={20} color={color} />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: spent === 0 ? colors.muted : colors.foreground }}>
                            {spent > 0 ? `R$ ${fmt(spent)}` : '—'}
                          </Text>
                          <Pressable onPress={() => setEditingCategory(cat)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
                            <MaterialIcons name="edit" size={16} color={colors.muted} />
                          </Pressable>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {spent > 0 ? `${pctOfTotal.toFixed(1)}% do total` : 'Sem gastos'}
                        </Text>
                        {budget > 0 && (
                          <Text style={{ fontSize: 11, color: available !== null && available < 0 ? '#EF4444' : colors.muted }}>
                            {available !== null && available >= 0
                              ? `R$ ${fmt(available)} disponível`
                              : available !== null
                              ? `R$ ${fmt(Math.abs(available))} excedido`
                              : ''}
                            {` / R$ ${fmt(budget)}`}
                          </Text>
                        )}
                      </View>
                      {budget > 0 && spent > 0 && <ProgressBar percent={percent} color={color} />}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <CategoryEditModal
        visible={editingCategory !== null}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={updateCategory}
      />
    </ScreenContainer>
  );
}

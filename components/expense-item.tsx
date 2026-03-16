import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Expense, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/expense';

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  transporte: 'directions-car',
  alimentacao: 'restaurant',
  moradia: 'home',
  saude: 'local-hospital',
  educacao: 'school',
  lazer: 'sports-esports',
  outro: 'category',
};

function formatItemDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

interface ExpenseItemProps {
  expense: Expense;
  onPress: (expense: Expense) => void;
  onTogglePaid?: (expense: Expense) => void;
  colorMap?: Record<string, string>;
  labelMap?: Record<string, string>;
  iconMap?: Record<string, string>;
}

export function ExpenseItem({ expense, onPress, onTogglePaid, colorMap, labelMap, iconMap }: ExpenseItemProps) {
  const categoryColor = (colorMap?.[expense.category] ?? CATEGORY_COLORS[expense.category]) || '#6B7280';
  const categoryLabel = (labelMap?.[expense.category] ?? CATEGORY_LABELS[expense.category]) || expense.category;
  const icon = ((iconMap?.[expense.category] ?? CATEGORY_ICONS[expense.category]) ?? 'category') as React.ComponentProps<typeof MaterialIcons>['name'];
  const accentColor = expense.paid ? '#22C55E' : categoryColor;

  return (
    <Pressable
      onPress={() => onPress(expense)}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      <View
        className="bg-surface flex-row items-center mb-2 overflow-hidden"
        style={{
          borderRadius: 16,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        {/* Category icon */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: categoryColor + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 14,
            marginRight: 12,
            marginVertical: 14,
          }}
        >
          <MaterialIcons name={icon} size={20} color={categoryColor} />
        </View>

        {/* Name + meta */}
        <View style={{ flex: 1, paddingVertical: 14 }}>
          <Text
            className="text-foreground"
            style={{ fontSize: 14, fontWeight: '600', opacity: expense.paid ? 0.5 : 1 }}
            numberOfLines={1}
          >
            {expense.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Text className="text-muted" style={{ fontSize: 11 }}>
              {categoryLabel}
            </Text>
            {expense.quantity ? (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9CA3AF' }} />
                <Text className="text-muted" style={{ fontSize: 11 }}>
                  {expense.quantity}
                </Text>
              </>
            ) : expense.date ? (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9CA3AF' }} />
                <Text className="text-muted" style={{ fontSize: 11 }}>
                  {formatItemDate(expense.date)}
                </Text>
              </>
            ) : null}
            {expense.bank ? (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9CA3AF' }} />
                <Text className="text-muted" style={{ fontSize: 11 }}>
                  {expense.bank}
                </Text>
              </>
            ) : null}
            {expense.expenseType ? (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9CA3AF' }} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: expense.expenseType === 'fixed' ? '#8B5CF6' : '#F59E0B' }}>
                  {expense.expenseType === 'fixed' ? 'Fixo' : 'Variável'}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Value + checkbox */}
        <View style={{ alignItems: 'flex-end', paddingRight: 16, paddingVertical: 14, gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: accentColor }}>
            R$ {expense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {onTogglePaid && (expense.quantity || expense.paymentType !== 'debit') && (
            <Pressable
              onPress={() => onTogglePaid(expense)}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: expense.paid ? '#22C55E' : '#9CA3AF',
                  backgroundColor: expense.paid ? '#22C55E' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {expense.paid && (
                  <MaterialIcons name="check" size={14} color="#fff" />
                )}
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

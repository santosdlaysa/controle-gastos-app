import { Pressable, Text, View } from 'react-native';
import { Expense, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/expense';
import { cn } from '@/lib/utils';

interface ExpenseItemProps {
  expense: Expense;
  onPress: (expense: Expense) => void;
  onTogglePaid?: (expense: Expense) => void;
}

export function ExpenseItem({ expense, onPress, onTogglePaid }: ExpenseItemProps) {
  const categoryColor = CATEGORY_COLORS[expense.category];
  const categoryLabel = CATEGORY_LABELS[expense.category];

  return (
    <Pressable
      onPress={() => onPress(expense)}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        className={cn(
          'flex-row items-center justify-between rounded-lg p-4 mb-3 border',
          expense.paid ? 'bg-success/10 border-success' : 'bg-surface border-border'
        )}
      >
        {/* Category indicator */}
        <View
          className="w-3 h-3 rounded-full mr-3"
          style={{ backgroundColor: categoryColor }}
        />

        {/* Expense details */}
        <View className="flex-1">
          <Text
            className={cn(
              'text-base font-semibold',
              expense.paid ? 'text-success' : 'text-foreground'
            )}
          >
            {expense.name}
          </Text>
          <View className="flex-row gap-2 mt-1">
            <Text className="text-xs text-muted">
              {categoryLabel}
            </Text>
            {expense.quantity && (
              <Text className="text-xs text-muted">
                • {expense.quantity}
              </Text>
            )}
          </View>
        </View>

        {/* Value + Paid checkbox */}
        <View className="flex-row items-center ml-4 gap-3">
          <Text
            className={cn(
              'text-base font-semibold',
              expense.paid ? 'text-success' : 'text-foreground'
            )}
          >
            R$ {expense.value.toFixed(2)}
          </Text>

          {onTogglePaid && (
            <Pressable
              onPress={() => onTogglePaid(expense)}
              hitSlop={8}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View
                className={cn(
                  'w-6 h-6 rounded-full border items-center justify-center',
                  expense.paid ? 'bg-success border-success' : 'border-border bg-surface'
                )}
              >
                {expense.paid && (
                  <Text className="text-xs font-bold text-background">✓</Text>
                )}
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

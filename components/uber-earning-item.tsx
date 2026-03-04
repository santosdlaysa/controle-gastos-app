import { Pressable, Text, View } from 'react-native';
import { UberEntry, getCategoryColor, getCategoryLabel } from '@/types/uber-earnings';

interface UberEarningItemProps {
  earning: UberEntry;
  onPress: (earning: UberEntry) => void;
}

export function UberEarningItem({ earning, onPress }: UberEarningItemProps) {
  const categoryColor = getCategoryColor(earning.category);
  const categoryLabel = getCategoryLabel(earning.category);
  const isGanho = earning.entryType === 'ganho';

  return (
    <Pressable
      onPress={() => onPress(earning)}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
    >
      <View
        className={`flex-row items-center justify-between rounded-lg p-4 mb-3 border ${
          isGanho ? 'bg-success/5 border-success/30' : 'bg-error/5 border-error/30'
        }`}
      >
        <View
          className="w-3 h-3 rounded-full mr-3"
          style={{ backgroundColor: categoryColor }}
        />
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{earning.description}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <View
              className={`px-2 py-0.5 rounded-full ${isGanho ? 'bg-success/20' : 'bg-error/20'}`}
            >
              <Text
                className={`text-[10px] font-semibold ${isGanho ? 'text-success' : 'text-error'}`}
              >
                {isGanho ? 'Ganho' : 'Gasto'}
              </Text>
            </View>
            <Text className="text-xs text-muted">{categoryLabel}</Text>
          </View>
        </View>
        <Text
          className={`text-base font-bold ml-4 ${isGanho ? 'text-success' : 'text-error'}`}
        >
          {isGanho ? '+' : '-'} R$ {earning.value.toFixed(2)}
        </Text>
      </View>
    </Pressable>
  );
}

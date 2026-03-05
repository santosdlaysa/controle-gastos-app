import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { UberEntry, getCategoryColor, getCategoryLabel } from '@/types/uber-earnings';

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  corrida: 'directions-car',
  uber_eats: 'restaurant',
  bonus: 'star',
  outro_ganho: 'attach-money',
  combustivel: 'local-gas-station',
  manutencao: 'build',
  pedagio: 'toll',
  lavagem: 'local-car-wash',
  seguro: 'security',
  outro_gasto: 'receipt-long',
};

function formatItemDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

interface UberEarningItemProps {
  earning: UberEntry;
  onPress: (earning: UberEntry) => void;
}

export function UberEarningItem({ earning, onPress }: UberEarningItemProps) {
  const categoryColor = getCategoryColor(earning.category);
  const categoryLabel = getCategoryLabel(earning.category);
  const isGanho = earning.entryType === 'ganho';
  const accentColor = isGanho ? '#10B981' : '#EF4444';
  const icon = (CATEGORY_ICONS[earning.category] ??
    (isGanho ? 'attach-money' : 'receipt-long')) as React.ComponentProps<typeof MaterialIcons>['name'];

  return (
    <Pressable
      onPress={() => onPress(earning)}
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

        {/* Description + meta */}
        <View style={{ flex: 1, paddingVertical: 14 }}>
          <Text
            className="text-foreground"
            style={{ fontSize: 14, fontWeight: '600' }}
            numberOfLines={1}
          >
            {earning.description}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Text className="text-muted" style={{ fontSize: 11 }}>
              {categoryLabel}
            </Text>
            {earning.date ? (
              <>
                <View
                  style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9CA3AF' }}
                />
                <Text className="text-muted" style={{ fontSize: 11 }}>
                  {formatItemDate(earning.date)}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Value + type badge */}
        <View style={{ alignItems: 'flex-end', paddingRight: 16, paddingVertical: 14 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: accentColor }}>
            {isGanho ? '+' : '−'} R$ {earning.value.toFixed(2)}
          </Text>
          <View
            style={{
              marginTop: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 20,
              backgroundColor: accentColor + '18',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: accentColor }}>
              {isGanho ? 'Ganho' : 'Gasto'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

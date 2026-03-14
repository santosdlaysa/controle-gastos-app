import { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types/expense';

type PaymentType = 'debit' | 'credit';

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  transporte: 'directions-car',
  alimentacao: 'restaurant',
  moradia: 'home',
  saude: 'local-hospital',
  educacao: 'school',
  lazer: 'sports-esports',
  outro: 'category',
};

function ExpenseList({
  items,
  loading,
  type,
  colors,
}: {
  items: any[];
  loading: boolean;
  type: PaymentType;
  colors: any;
}) {
  const { width } = useWindowDimensions();

  if (loading) {
    return (
      <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={{ width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
        <MaterialIcons
          name={type === 'debit' ? 'account-balance-wallet' : 'credit-card'}
          size={48}
          color={colors.muted}
        />
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 16, textAlign: 'center' }}>
          Sem transações de {type === 'debit' ? 'débito' : 'crédito'}
        </Text>
      </View>
    );
  }

  const total = items.reduce((sum: number, e: any) => sum + parseFloat(e.value), 0);

  return (
    <View style={{ width, flex: 1 }}>
      {/* Total */}
      <View style={{ marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {items.length} transaç{items.length === 1 ? 'ão' : 'ões'}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
          Total: R$ {total.toFixed(2)}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }}
        renderItem={({ item }) => {
          const cat = item.category as keyof typeof CATEGORY_COLORS;
          const color = CATEGORY_COLORS[cat] ?? '#6B7280';
          const icon = (CATEGORY_ICONS[item.category] ?? 'category') as React.ComponentProps<typeof MaterialIcons>['name'];
          const isPaid = item.paid ?? false;

          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderLeftWidth: 4,
                borderLeftColor: isPaid ? '#22C55E' : color,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <View
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  backgroundColor: color + '20',
                  alignItems: 'center', justifyContent: 'center',
                  marginLeft: 12, marginRight: 10, marginVertical: 14,
                }}
              >
                <MaterialIcons name={icon} size={18} color={color} />
              </View>

              <View style={{ flex: 1, paddingVertical: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, opacity: isPaid ? 0.5 : 1 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <Text style={{ fontSize: 11, color: colors.muted }}>{CATEGORY_LABELS[cat] ?? item.category}</Text>
                  {item.date ? (
                    <>
                      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9CA3AF' }} />
                      <Text style={{ fontSize: 11, color: colors.muted }}>{formatDate(item.date)}</Text>
                    </>
                  ) : null}
                  {item.quantity ? (
                    <>
                      <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9CA3AF' }} />
                      <Text style={{ fontSize: 11, color: colors.muted }}>{item.quantity}</Text>
                    </>
                  ) : null}
                </View>
              </View>

              <View style={{ alignItems: 'flex-end', paddingRight: 14, paddingVertical: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: isPaid ? '#22C55E' : color }}>
                  R$ {parseFloat(item.value).toFixed(2)}
                </Text>
                {isPaid && <Text style={{ fontSize: 10, color: '#22C55E', marginTop: 2 }}>pago</Text>}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

export default function BankDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const bankId = parseInt(id ?? '0', 10);
  const TABS: PaymentType[] = ['debit', 'credit'];

  const { data: bank, isLoading: bankLoading } = trpc.bank.getById.useQuery(
    { id: bankId },
    { enabled: bankId > 0 },
  );

  const { data: debitExpenses = [], isLoading: debitLoading } = trpc.expense.getByBank.useQuery(
    { bankName: bank?.name ?? '', paymentType: 'debit' },
    { enabled: !!bank?.name },
  );

  const { data: creditExpenses = [], isLoading: creditLoading } = trpc.expense.getByBank.useQuery(
    { bankName: bank?.name ?? '', paymentType: 'credit' },
    { enabled: !!bank?.name },
  );

  const data = [debitExpenses, creditExpenses];
  const loading = [bankLoading || debitLoading, bankLoading || creditLoading];

  function goToTab(index: number) {
    setActiveIndex(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  }

  function onScrollEnd(e: any) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  // Indicador deslizante
  const indicatorLeft = activeIndex === 0 ? 4 : width / 2 - 4;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, flex: 1 }}>
          {bank?.name ?? '...'}
        </Text>
      </View>

      {/* Toggle deslizante */}
      <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, position: 'relative' }}>
          {/* Pill animado */}
          <View
            style={{
              position: 'absolute',
              top: 4,
              left: activeIndex === 0 ? 4 : '50%',
              width: '50%',
              bottom: 4,
              backgroundColor: colors.tint,
              borderRadius: 10,
            }}
          />
          {TABS.map((tab, i) => (
            <Pressable key={tab} onPress={() => goToTab(i)} style={{ flex: 1, zIndex: 1 }}>
              <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: activeIndex === i ? '#fff' : colors.muted }}>
                  {tab === 'debit' ? 'Débito' : 'Crédito'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Páginas deslizantes */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {TABS.map((tab, i) => (
          <ExpenseList
            key={tab}
            items={data[i]}
            loading={loading[i]}
            type={tab}
            colors={colors}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

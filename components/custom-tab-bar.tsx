import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, View, Text, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useColors } from '@/hooks/use-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { callFabListener } from '@/lib/fab-action';

// ── medidas ───────────────────────────────────────────────────────
const FAB_SIZE = 56;
const FAB_R    = FAB_SIZE / 2; // 28
const BAR_H    = 56;           // altura da barra de navegação

// O FAB fica metade acima da barra, metade dentro — sem notch
// O topo do container é o topo do FAB; a barra começa em FAB_R
const BAR_TOP  = FAB_R;       // 28 — onde a barra começa

// ── abas ──────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',     label: 'Início',     icon: 'home'         },
  { name: 'history',   label: 'Histórico',  icon: 'bar-chart'    },
  { name: 'assistant', label: 'Assistente', icon: 'auto-awesome' },
  { name: 'settings',  label: 'Config',     icon: 'settings'     },
] as const;

// ─────────────────────────────────────────────────────────────────

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = scheme === 'dark';

  const bottomPad = insets.bottom;
  const [containerW, setContainerW] = useState(Dimensions.get('window').width);
  const activeRoute = state.routes[state.index]?.name;

  // Altura total: FAB_R (acima da barra) + BAR_H + safe area
  const totalH = BAR_TOP + BAR_H + bottomPad;

  function press(name: string) {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ev = navigation.emit({ type: 'tabPress', target: name, canPreventDefault: true });
    if (!ev.defaultPrevented) navigation.navigate(name);
  }

  function pressFAB() {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!callFabListener()) navigation.navigate('banks');
  }

  return (
    <View
      style={{ height: totalH, backgroundColor: 'transparent' }}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      {/* ── 1. Barra (começa em BAR_TOP, vai até o fundo incluindo safe area) ── */}
      <View
        style={{
          position:        'absolute',
          top:             BAR_TOP,
          left:            0,
          right:           0,
          bottom:          0,
          backgroundColor: colors.surface,
          zIndex:          1,
          ...Platform.select({
            ios: {
              shadowColor:   '#000',
              shadowOffset:  { width: 0, height: -2 },
              shadowOpacity: isDark ? 0.2 : 0.07,
              shadowRadius:  8,
            },
            android: { elevation: 0 },
          }),
        }}
      />

      {/* ── 2. Itens de navegação ─────────────────────────────────── */}
      <View
        style={{
          position:      'absolute',
          top:           BAR_TOP,
          left:          0,
          right:         0,
          height:        BAR_H,
          flexDirection: 'row',
          zIndex:        2,
        }}
      >
        {/* esquerda */}
        {TABS.slice(0, 2).map((tab) => {
          const active = activeRoute === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => press(tab.name)}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <MaterialIcons
                  name={tab.icon as any}
                  size={22}
                  color={active ? colors.tint : colors.tabIconDefault}
                />
                {active && (
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.tint }}>
                    {tab.label}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}

        {/* espaço central para o FAB */}
        <View style={{ width: FAB_SIZE + 16 }} />

        {/* direita */}
        {TABS.slice(2).map((tab) => {
          const active = activeRoute === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => press(tab.name)}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <MaterialIcons
                  name={tab.icon as any}
                  size={22}
                  color={active ? colors.tint : colors.tabIconDefault}
                />
                {active && (
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.tint }}>
                    {tab.label}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── 3. FAB — flutua sobre a barra, sem notch ─────────────── */}
      <Pressable
        onPress={pressFAB}
        style={({ pressed }) => ({
          position:        'absolute',
          top:             0,
          left:            containerW / 2 - FAB_R,
          width:           FAB_SIZE,
          height:          FAB_SIZE,
          borderRadius:    FAB_R,
          backgroundColor: colors.tint,
          alignItems:      'center',
          justifyContent:  'center',
          opacity:         pressed ? 0.85 : 1,
          zIndex:          3,
          ...Platform.select({
            ios: {
              shadowColor:   colors.tint,
              shadowOffset:  { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.8 : 0.5,
              shadowRadius:  isDark ? 20 : 12,
            },
            android: { elevation: 8 },
          }),
        })}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

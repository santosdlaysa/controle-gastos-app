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
const FAB_R    = FAB_SIZE / 2;
const BAR_H    = 64;
const BAR_MX   = 16;          // margem horizontal da barra
const BAR_RADIUS = 20;        // cantos arredondados

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

  const bottomPad = Math.max(insets.bottom, 8);
  const [containerW, setContainerW] = useState(Dimensions.get('window').width);
  const activeRoute = state.routes[state.index]?.name;

  // Altura total: metade do FAB acima + barra + safe area
  const totalH = FAB_R + BAR_H + bottomPad;

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
      pointerEvents="box-none"
      style={{ height: totalH }}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      {/* ── 1. Barra com cantos arredondados ── */}
      <View
        style={{
          position:        'absolute',
          top:             FAB_R,
          left:            BAR_MX,
          right:           BAR_MX,
          height:          BAR_H + bottomPad,
          backgroundColor: colors.surface,
          borderTopLeftRadius:  BAR_RADIUS,
          borderTopRightRadius: BAR_RADIUS,
          zIndex:          1,
          ...Platform.select({
            ios: {
              shadowColor:   '#000',
              shadowOffset:  { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.25 : 0.08,
              shadowRadius:  12,
            },
            android: { elevation: 12 },
          }),
        }}
      />

      {/* ── 2. Itens de navegação ── */}
      <View
        style={{
          position:      'absolute',
          top:           FAB_R,
          left:          BAR_MX,
          right:         BAR_MX,
          height:        BAR_H,
          flexDirection: 'row',
          alignItems:    'center',
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
              <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <MaterialIcons
                  name={tab.icon as any}
                  size={24}
                  color={active ? colors.tint : colors.tabIconDefault}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: active ? '700' : '500',
                    color: active ? colors.tint : colors.tabIconDefault,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {/* espaço central para o FAB */}
        <View style={{ width: FAB_SIZE + 20 }} />

        {/* direita */}
        {TABS.slice(2).map((tab) => {
          const active = activeRoute === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => press(tab.name)}
              style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <MaterialIcons
                  name={tab.icon as any}
                  size={24}
                  color={active ? colors.tint : colors.tabIconDefault}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: active ? '700' : '500',
                    color: active ? colors.tint : colors.tabIconDefault,
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── 3. FAB flutuante ── */}
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
          transform:       [{ scale: pressed ? 0.92 : 1 }],
          zIndex:          3,
          ...Platform.select({
            ios: {
              shadowColor:   colors.tint,
              shadowOffset:  { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius:  12,
            },
            android: { elevation: 10 },
          }),
        })}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

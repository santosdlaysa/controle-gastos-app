import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, View, Text, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useColors } from '@/hooks/use-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ── medidas ───────────────────────────────────────────────────────
const FAB_SIZE   = 56;
const FAB_R      = FAB_SIZE / 2;   // 28

// NOTCH_R = raio do círculo mascara (ligeiramente maior que FAB_R)
// BAR_OFFSET = NOTCH_R → o círculo começa exato no topo do container (top=0)
// e o centro do círculo coincide com o topo da barra.
const NOTCH_R    = FAB_R + 5;   // 33 — círculo mascara levemente maior que o FAB
const BAR_OFFSET = NOTCH_R;     // 33 — topo do container ao topo da barra
const BAR_H      = 62;
const BAR_CORNER = 0;           // sem arredondamento lateral: borda a borda
const H_MARGIN   = 0;           // sem margem: ocupa toda a largura

// ── abas ──────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',     label: 'Início',     icon: 'home'         },
  { name: 'history',   label: 'Histórico',  icon: 'bar-chart'    },
  { name: 'assistant', label: 'Assistente', icon: 'auto-awesome' },
  { name: 'settings',  label: 'Config',     icon: 'settings'     },
] as const;

// ─────────────────────────────────────────────────────────────────

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const colors    = useColors();
  const scheme    = useColorScheme();
  const insets    = useSafeAreaInsets();
  const isDark    = scheme === 'dark';
  const bottomPad = Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8);

  const [containerW, setContainerW] = useState(Dimensions.get('window').width);
  const barW = Math.max(containerW - H_MARGIN * 2, 1);

  const activeRoute = state.routes[state.index]?.name;

  function press(name: string) {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ev = navigation.emit({ type: 'tabPress', target: name, canPreventDefault: true });
    if (!ev.defaultPrevented) navigation.navigate(name);
  }

  function pressFAB() {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('banks');
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <View
      style={{ backgroundColor: colors.background }}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      {/*
        Filho não-absoluto: define a altura do container
        (BAR_OFFSET acima + barra + padding abaixo)
      */}
      <View style={{ height: BAR_H, marginTop: BAR_OFFSET, marginBottom: bottomPad }} />

      {/* ── 1. Barra (fundo elevado) ─────────────────────────── */}
      <View
        style={{
          position:        'absolute',
          top:             BAR_OFFSET,
          left:            H_MARGIN,
          width:           barW,
          height:          BAR_H,
          backgroundColor: colors.surface,
          borderRadius:    BAR_CORNER,
          // sombra
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: -2 },
          shadowOpacity:   isDark ? 0.25 : 0.08,
          shadowRadius:    10,
          elevation:       10,
        }}
      />

      {/*
        ── 2. Notch: CÍRCULO COMPLETO centrado no topo da barra ─
        Centro em (containerW/2, BAR_OFFSET).
        Como BAR_OFFSET = NOTCH_R, o círculo começa em top=0
        (nenhuma parte vai acima do container).
        A borda do círculo cria a curva suave côncava ao redor do FAB.
        A metade inferior do círculo "recorta" a barra com a cor do fundo.
      */}
      <View
        style={{
          position:        'absolute',
          top:             0,                        // BAR_OFFSET - NOTCH_R = 0
          left:            containerW / 2 - NOTCH_R,
          width:           NOTCH_R * 2,
          height:          NOTCH_R * 2,
          borderRadius:    NOTCH_R,
          backgroundColor: colors.background,
        }}
      />

      {/* ── 3. Itens de navegação ────────────────────────────── */}
      <View
        style={{
          position:  'absolute',
          top:       BAR_OFFSET,
          left:      H_MARGIN,
          width:     barW,
          height:    BAR_H,
          flexDirection: 'row',
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

        {/* espaço central para o notch */}
        <View style={{ width: NOTCH_R * 2 + 4 }} />

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

      {/*
        ── 4. FAB ───────────────────────────────────────────────
        top = 0  → topo do FAB = topo do container
        FAB center (y = FAB_R = 28) = BAR_OFFSET = topo da barra ✓
        left = containerW/2 - FAB_R → centralizado com precisão
      */}
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
          shadowColor:     colors.tint,
          shadowOffset:    { width: 0, height: 4 },
          shadowOpacity:   isDark ? 0.8 : 0.5,
          shadowRadius:    isDark ? 20 : 12,
          elevation:       16,
        })}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

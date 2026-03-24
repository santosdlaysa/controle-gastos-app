import { Tabs, useRouter, usePathname } from "expo-router";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getAppMode } from "@/lib/mode";
import { CustomTabBar } from "@/components/custom-tab-bar";

export default function TabLayout() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          tabBarButton: (props) => (
            <HapticTab
              {...props}
              onPress={(e) => {
                if (getAppMode() === 'uber') {
                  router.navigate('/(tabs)/uber-earnings');
                } else {
                  props.onPress?.(e);
                }
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categorias",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.pie.fill" color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="banks"
        options={{
          title: "Bancos",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: "Assistente",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chevron.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="uber-earnings"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="debtors"
        options={{ href: null }}
      />
    </Tabs>
  );
}

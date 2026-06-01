import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import {
  ThemeProvider as NavThemeProvider,
  DefaultTheme,
  DarkTheme,
} from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import {
  initManusRuntime,
  subscribeSafeAreaInsets,
} from "@/lib/_core/manus-runtime";
import { AuthProvider, useAuthContext } from "@/lib/auth-context";
import { useMigration } from "@/hooks/use-migration";
import {
  getUberFeatureEnabled,
  isUberFeatureUnconfigured,
} from "@/lib/uber-feature";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initPurchases } from "@/hooks/use-purchases";
import { useAppOpenAd } from "@/hooks/use-app-open-ad";

const DEFAULT_WEB_INSETS: EdgeInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const DEFAULT_WEB_FRAME: Rect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

export const unstable_settings = {
  anchor: "(tabs)",
};

function MigrationGate({ children }: { children: React.ReactNode }) {
  const { state, isNeeded, isDone, runMigration } = useMigration();

  useEffect(() => {
    if (isNeeded) {
      runMigration();
    }
  }, [isNeeded, runMigration]);

  if (isDone || state === "error") {
    return <>{children}</>;
  }

  return (
      <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
      >
        <ActivityIndicator size="large" />
        <Text
            style={{
              marginTop: 16,
              fontSize: 16,
              textAlign: "center",
              color: "#666",
            }}
        >
          {state === "checking"
              ? "Verificando dados..."
              : "Transferindo seus dados para o servidor..."}
        </Text>
      </View>
  );
}

function NavLayout() {
  const { isAuthenticated, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const hasNavigatedRef = useRef(false);

  useAppOpenAd();

  useEffect(() => {
    hasNavigatedRef.current = false;
  }, [isAuthenticated]);

  useEffect(() => {
    if (loading) return;
    if (!navigationState?.key) return;

    const onLoginScreen = segments[0] === "login";
    const onForgotPassword = segments[0] === "forgot-password";

    if (!isAuthenticated && !onLoginScreen && !onForgotPassword) {
      router.replace("/login");
    } else if (
        isAuthenticated &&
        onLoginScreen &&
        !hasNavigatedRef.current
    ) {
      hasNavigatedRef.current = true;

      (async () => {
        const unconfigured = await isUberFeatureUnconfigured();
        const uberEnabled = await getUberFeatureEnabled();
        const onboardingDone = await AsyncStorage.getItem(
            "onboarding_checklist_dismissed"
        );

        if (unconfigured) {
          router.replace("/mode-select");
        } else if (onboardingDone !== "true") {
          router.replace("/onboarding");
        } else {
          router.replace("/(tabs)");
        }
      })();
    }
  }, [
    isAuthenticated,
    loading,
    segments,
    router,
    navigationState?.key,
  ]);

  if (loading) {
    return (
        <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
        >
          <ActivityIndicator size="large" />
        </View>
    );
  }

  if (!isAuthenticated) {
    return (
        <>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="login"
                options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="oauth/callback" />
            <Stack.Screen name="mode-select" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
        </>
    );
  }

  return (
      <MigrationGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
              name="login"
              options={{ presentation: "fullScreenModal" }}
          />
          <Stack.Screen name="oauth/callback" />
          <Stack.Screen name="mode-select" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="bank-select" />
          <Stack.Screen name="bank/[id]" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </MigrationGate>
  );
}

function RootLayoutInner() {
  const initialInsets =
      initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;

  const initialFrame =
      initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  const colors = useColors();
  const scheme = useColorScheme();

  const navTheme = {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === "dark" ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
    },
  };

  useEffect(() => {
    initManusRuntime();
  }, []);

  useEffect(() => {
    try {
      initPurchases();
    } catch (e) {
      console.warn("RevenueCat init error:", e);
    }
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
      () =>
          new QueryClient({
            defaultOptions: {
              queries: {
                refetchOnWindowFocus: false,
                retry: 1,
              },
            },
          })
  );

  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics =
        initialWindowMetrics ?? {
          insets: initialInsets,
          frame: initialFrame,
        };

    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NavLayout />
            </AuthProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  return (
      <NavThemeProvider value={navTheme}>
        {shouldOverrideSafeArea ? (
            <SafeAreaProvider initialMetrics={providerInitialMetrics}>
              <SafeAreaFrameContext.Provider value={frame}>
                <SafeAreaInsetsContext.Provider value={insets}>
                  {content}
                </SafeAreaInsetsContext.Provider>
              </SafeAreaFrameContext.Provider>
            </SafeAreaProvider>
        ) : (
            <SafeAreaProvider initialMetrics={providerInitialMetrics}>
              {content}
            </SafeAreaProvider>
        )}
      </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
  );
}
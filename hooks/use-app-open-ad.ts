import { useEffect, useRef } from "react";
import { Platform, AppState } from "react-native";
import {
  AppOpenAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

const APP_OPEN_AD_UNIT_ID = Platform.select({
  android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_OPEN ?? TestIds.APP_OPEN,
  ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_OPEN ?? TestIds.APP_OPEN,
  default: TestIds.APP_OPEN,
});

export function useAppOpenAd() {
  const appOpenAd = useRef<AppOpenAd | null>(null);
  const appState = useRef(AppState.currentState);
  const shouldShowOnLoad = useRef(true);

  useEffect(() => {
    if (Platform.OS === "web") return;

    function createAd() {
      appOpenAd.current = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT_ID);

      appOpenAd.current.addAdEventListener(AdEventType.LOADED, () => {
        if (shouldShowOnLoad.current) {
          appOpenAd.current?.show();
        }
      });

      appOpenAd.current.addAdEventListener(AdEventType.CLOSED, () => {
        // Pre-load next ad without showing it automatically
        shouldShowOnLoad.current = false;
        createAd();
        appOpenAd.current?.load();
      });

      appOpenAd.current.addAdEventListener(AdEventType.ERROR, (error) => {
        console.warn("[AppOpenAd] Error:", error);
      });
    }

    // Load and show the first ad on app launch
    shouldShowOnLoad.current = true;
    createAd();
    appOpenAd.current?.load();

    // Show ad when user returns to the app from background
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        shouldShowOnLoad.current = true;
        if (appOpenAd.current) {
          appOpenAd.current.load();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

/**
 * Bundle ID rules:
 * - Only letters, numbers and dots
 * - Each segment must start with a letter (Android requirement)
 */


const rawBundleId = "com.orgenyx";

const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".")
    .replace(/[^a-zA-Z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase()
    .split(".")
    .map((segment) =>
      /^[a-zA-Z]/.test(segment) ? segment : "x" + segment
    )
    .join(".") || "space.manus.app";

// Deep link scheme baseado no timestamp final
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const config: ExpoConfig = {
  name: "Orgenyx",
  slug: "controle-gastos-app",

  // 🔢 Versão visível ao usuário
  version: "2.1.1",

  // 🔥 IMPORTANTE PARA EAS UPDATE (boa prática)
  runtimeVersion: {
    policy: "appVersion",
  },

  updates: {
    url: "https://u.expo.dev/fba3145b-33ac-45a7-97b9-beb3c022e06b",
  },

  extra: {
    eas: {
      projectId: "fba3145b-33ac-45a7-97b9-beb3c022e06b",
    },
  },

  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: schemeFromBundleId,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    buildNumber: "21",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: bundleId,

    // 🔢 OBRIGATÓRIO PARA PLAY STORE
    versionCode: 6,

    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },

    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,

    permissions: ["POST_NOTIFICATIONS"],

    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: schemeFromBundleId,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",

    [
      "react-native-google-mobile-ads",
      {
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
      },
    ],

    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],

    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1",
        },
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
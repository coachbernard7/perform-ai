import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";
const performBasePath = (process.env.EXPO_PUBLIC_PERFORM_BASE_PATH || "/app").replace(/\/+$/, "");
if (!/^\/[A-Za-z0-9/_-]*$/.test(performBasePath)) throw new Error("Invalid Perform AI deployment path.");

const rawBundleId = "space.manus.speech.rehearser.t20260920134237";
const bundleId = rawBundleId.toLowerCase();

const config: ExpoConfig = {
  name: "PERFORM AI",
  slug: "perform-ai",
  description: "Private rehearsal tools for speeches, presentations, sermons, lessons, and scripts.",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "performai",
  userInterfaceStyle: "dark",
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#050811",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    package: bundleId,
    permissions: ["RECORD_AUDIO"],
  },
  web: {
    bundler: "metro",
    // HostGator is a shared static host. The Apache SPA fallback serves this one
    // client-rendered entry point for every Expo Router route and avoids a server/
    // client hydration mismatch caused by prerendering native navigation trees.
    output: "single",
    favicon: "./assets/images/favicon.png",
    name: "PERFORM AI",
    shortName: "PERFORM AI",
    themeColor: "#050811",
    backgroundColor: "#050811",
  },
  plugins: [
    "expo-router",
    "expo-asset",
    "expo-document-picker",
    "expo-font",
    "expo-image",
    ["expo-image-picker", { photosPermission: "Allow PERFORM AI to select a photo for a low-resolution profile thumbnail." }],
    "expo-secure-store",
    "expo-status-bar",
    "expo-video",
    "expo-web-browser",
    ["expo-audio", { microphonePermission: "Allow PERFORM AI to record your rehearsal." }],
    ["expo-splash-screen", { image: "./assets/images/splash-icon.png", imageWidth: 180, resizeMode: "contain", backgroundColor: "#050811" }],
    ["expo-build-properties", { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24 } }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true, baseUrl: performBasePath },
};

export default config;

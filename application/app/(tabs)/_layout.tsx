import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppStore } from "@/lib/app-store";

const ICONS = {
  index: "home-filled",
  files: "description",
  train: "mic",
  scores: "insights",
  profile: "person",
} as const;

export default function TabLayout() {
  const { palette } = useAppStore();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
        tabBarStyle: {
          height: 58 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialIcons name={ICONS[route.name as keyof typeof ICONS] ?? "circle"} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="files" options={{ title: "Scripts" }} />
      <Tabs.Screen name="train" options={{ title: "Train" }} />
      <Tabs.Screen name="scores" options={{ title: "Scores" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

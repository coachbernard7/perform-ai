import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ActionButton, Card } from "@/components/app-ui";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";

export function useRequireLogin() {
  const { isAuthenticated, ready } = usePerformAuth();
  return (action: () => void) => {
    if (!ready || !isAuthenticated) {
      router.push("/login" as any);
      return;
    }
    action();
  };
}

export function PrivateContentGate({ title, body }: { title: string; body: string }) {
  const { palette } = useAppStore();
  const { ready, isAuthenticated } = usePerformAuth();
  if (!ready) {
    return <View style={styles.loading}><ActivityIndicator color={palette.primary} /><Text style={[styles.loadingText, { color: palette.muted }]}>Checking private access…</Text></View>;
  }
  if (isAuthenticated) return null;
  return (
    <Card style={styles.card}>
      <View style={[styles.icon, { backgroundColor: `${palette.primary}18` }]}><MaterialIcons name="lock" size={26} color={palette.primary} /></View>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.body, { color: palette.muted }]}>{body}</Text>
      <ActionButton label="Log in to continue" icon="login" onPress={() => router.push("/login" as any)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 28 },
  loadingText: { fontSize: 13, fontWeight: "700" },
  card: { marginTop: 30, alignItems: "center", gap: 12, paddingVertical: 28 },
  icon: { width: 58, height: 58, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 21, lineHeight: 27, fontFamily: "serif", fontWeight: "700", textAlign: "center" },
  body: { fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 310, marginBottom: 4 },
});

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useRequireLogin } from "@/components/auth-gate";
import { ActionButton, AppScreen, BrandLockup, Card } from "@/components/app-ui";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";

export default function HomeScreen() {
  const { palette } = useAppStore();
  const { ready, account, isAuthenticated } = usePerformAuth();
  const requireLogin = useRequireLogin();

  return (
    <AppScreen contentStyle={styles.screen}>
      <BrandLockup />
      <View style={styles.accountRow}>
        <View style={[styles.accountPill, { backgroundColor: isAuthenticated ? `${palette.success}18` : palette.surfaceAlt, borderColor: isAuthenticated ? `${palette.success}66` : palette.border }]}>
          <MaterialIcons name={isAuthenticated ? "verified-user" : "visibility"} size={15} color={isAuthenticated ? palette.success : palette.muted} />
          <Text style={[styles.accountText, { color: isAuthenticated ? palette.success : palette.muted }]}>{!ready ? "Checking access" : isAuthenticated ? `Logged in as ${account?.name}` : "Visitor preview"}</Text>
        </View>
        {!isAuthenticated && ready ? <Pressable onPress={() => router.push("/login" as any)} style={({ pressed }) => [styles.loginLink, pressed && styles.pressed]}><Text style={[styles.loginText, { color: palette.accent }]}>Log in</Text><MaterialIcons name="login" size={16} color={palette.accent} /></Pressable> : null}
      </View>
      <Card style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={[styles.kicker, { color: palette.accent }]}>PRIVATE BY DEFAULT</Text>
          <Text style={[styles.heroTitle, { color: palette.text }]}>{isAuthenticated ? `Welcome back,\n${account?.name?.split(" ")[0] ?? "Member"}.` : "Private rehearsal."}</Text>
          <Text style={[styles.heroBody, { color: palette.muted }]}>{isAuthenticated ? "Your private rehearsal space is ready on this device." : "Explore freely. Log in to create and protect your private scripts."}</Text>
        </View>
        <View style={styles.actions}>
          <ActionButton label="Open scripts" icon="description" onPress={() => requireLogin(() => router.push("/(tabs)/files"))} />
          <ActionButton label="Add private script" icon="add" kind="ghost" onPress={() => requireLogin(() => router.push("/script/new"))} />
        </View>
        <Image source={require("../../assets/images/guardian.png")} style={styles.guardian} resizeMode="contain" />
      </Card>
      <Pressable accessibilityRole="button" onPress={() => requireLogin(() => router.push("/payments"))} style={({ pressed }) => [styles.membership, { borderColor: palette.border }, pressed && styles.pressed]}>
        <Text style={[styles.membershipLabel, { color: palette.muted }]}>Membership & verification</Text><MaterialIcons name="arrow-forward" size={18} color={palette.accent} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "space-between", paddingBottom: 34 },
  accountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 },
  accountPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, maxWidth: "72%" },
  accountText: { fontSize: 10, fontWeight: "800" },
  loginLink: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7, paddingLeft: 8 },
  loginText: { fontSize: 11, fontWeight: "800" },
  hero: { minHeight: 390, marginTop: 18, overflow: "hidden", padding: 22, justifyContent: "space-between" },
  heroCopy: { width: "66%", zIndex: 2, paddingTop: 8 },
  kicker: { fontSize: 10, lineHeight: 14, letterSpacing: 2.1, fontWeight: "800", marginBottom: 10 },
  heroTitle: { fontSize: 38, lineHeight: 42, fontFamily: "serif", fontWeight: "700", marginBottom: 8 },
  heroBody: { fontSize: 14, lineHeight: 21 },
  actions: { width: "64%", gap: 10, zIndex: 2 },
  guardian: { position: "absolute", width: 225, height: 326, right: -46, bottom: -18, opacity: 0.95 },
  membership: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  membershipLabel: { fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { MatrixRain } from "@/components/matrix-rain";
import { useAppStore } from "@/lib/app-store";
import type { ThemeName } from "@/lib/app-types";
import { usePerformAuth } from "@/lib/perform-auth";

const QUICK_THEMES: { name: ThemeName; label: string; swatch: string }[] = [
  { name: "blue", label: "Blue with green rain", swatch: "#39FF88" },
  { name: "black-gold", label: "Black and gold", swatch: "#F5B324" },
  { name: "black-blue", label: "Black with light blue", swatch: "#22C8FF" },
  { name: "white", label: "White with black and blue", swatch: "#F5F8FC" },
];

export function AppScreen({ children, scroll = false, contentStyle }: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle }>) {
  const { palette, settings, updateSettings } = useAppStore();
  const { account, isAuthenticated, logout } = usePerformAuth();
  const signOut = async () => {
    await logout();
    router.replace("/login");
  };
  const content = scroll ? (
    <ScrollView contentContainerStyle={[styles.scrollContent, isAuthenticated && styles.withAccountDock, contentStyle]} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, isAuthenticated && styles.withAccountDock, contentStyle]}>{children}</View>
  );

  return (
    <ScreenContainer style={{ backgroundColor: palette.background }}>
      <LinearGradient colors={[palette.background, palette.backgroundEnd]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, { backgroundColor: `${palette.accent}12` }]} />
      {settings.theme === "blue" ? <MatrixRain color={palette.primary} background={palette.background} reduceMotion={settings.reduceMotion} /> : null}
      <View accessibilityRole="toolbar" accessibilityLabel="Colour themes" style={[styles.themeDock, { backgroundColor: `${palette.surface}EE`, borderColor: palette.border }]}>
        {QUICK_THEMES.map((theme) => {
          const selected = settings.theme === theme.name;
          return <Pressable key={theme.name} accessibilityRole="button" accessibilityLabel={`${theme.label}${selected ? ", selected" : ""}`} onPress={() => updateSettings({ theme: theme.name })} style={({ pressed }) => [styles.themeOption, selected && { borderColor: palette.primary, backgroundColor: `${palette.primary}18` }, pressed && styles.pressed]}>
            <View style={[styles.themeSwatch, { backgroundColor: theme.swatch, borderColor: theme.name === "white" ? "#A8B6C6" : theme.swatch }]} />
          </Pressable>;
        })}
      </View>
      {isAuthenticated ? <View accessibilityRole="toolbar" accessibilityLabel="Account session" style={[styles.accountDock, { backgroundColor: `${palette.surface}EE`, borderColor: palette.border }]}><Text numberOfLines={1} style={[styles.accountName, { color: palette.muted }]}>{account?.username ?? "Signed in"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={() => { void signOut(); }} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}><MaterialIcons name="logout" size={16} color={palette.danger} /><Text style={[styles.logoutText, { color: palette.danger }]}>Log out</Text></Pressable></View> : null}
      {content}
    </ScreenContainer>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  const { palette } = useAppStore();
  return (
    <View style={styles.brandRow}>
      <View style={[styles.brandIcon, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Image source={require("../assets/images/icon.png")} style={styles.brandImage} resizeMode="contain" />
      </View>
      <View style={styles.brandWords}>
        <Text style={[styles.brandEyebrow, { color: palette.primary }]}>ALPHA OMEGA</Text>
        <Text numberOfLines={compact ? 1 : 2} style={[styles.brandTitle, { color: palette.text }]}>PERFORM AI</Text>
      </View>
    </View>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  const { palette } = useAppStore();
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingCopy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: palette.accent }]}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const { palette } = useAppStore();
  return <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, style]}>{children}</View>;
}

export function ActionButton({
  label,
  onPress,
  icon,
  kind = "primary",
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  kind?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  compact?: boolean;
}) {
  const { palette } = useAppStore();
  const backgroundColor = kind === "primary" ? palette.primary : kind === "secondary" ? palette.surfaceAlt : kind === "danger" ? `${palette.danger}24` : "transparent";
  const color = kind === "primary" ? (palette.background === "#F5F8FC" ? "#FFFFFF" : "#050811") : kind === "danger" ? palette.danger : palette.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor, borderColor: kind === "ghost" ? palette.border : backgroundColor },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <MaterialIcons name={icon} size={compact ? 17 : 20} color={color} /> : null}
      <Text style={[styles.buttonText, compact && styles.buttonTextCompact, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const { palette } = useAppStore();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: accent ?? palette.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: palette.muted }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; body: string }) {
  const { palette } = useAppStore();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: `${palette.accent}14` }]}>
        <MaterialIcons name={icon} size={28} color={palette.accent} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: palette.muted }]}>{body}</Text>
    </View>
  );
}

export function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const { palette } = useAppStore();
  return (
    <View style={[styles.progressTrack, { backgroundColor: palette.surfaceAlt }]}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color ?? palette.primary }]} />
    </View>
  );
}

export const commonStyles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 23 },
  muted: { fontSize: 13, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center" },
  spaceBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
});

const styles = StyleSheet.create({
  fill: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 120 },
  withAccountDock: { paddingTop: 66 },
  glow: { position: "absolute", width: 280, height: 280, borderRadius: 140, top: -140, right: -100 },
  themeDock: { position: "absolute", zIndex: 8, top: 12, right: 14, flexDirection: "row", gap: 3, borderWidth: 1, borderRadius: 16, padding: 4 },
  accountDock: { position: "absolute", zIndex: 8, top: 12, left: 14, flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 16, padding: 4, paddingLeft: 10, maxWidth: 155 },
  accountName: { maxWidth: 56, fontSize: 9, fontWeight: "800" },
  logoutButton: { minHeight: 28, borderRadius: 11, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", gap: 4 },
  logoutText: { fontSize: 10, fontWeight: "800" },
  themeOption: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent", borderRadius: 11 },
  themeSwatch: { width: 15, height: 15, borderRadius: 6, borderWidth: 1 },
  brandRow: { alignItems: "center", alignSelf: "center", gap: 6, minHeight: 104, paddingTop: 10 },
  brandIcon: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  brandImage: { width: 40, height: 40 },
  brandWords: { alignItems: "center", flexShrink: 1 },
  brandEyebrow: { fontSize: 9, fontWeight: "800", letterSpacing: 2.4, textAlign: "center" },
  brandTitle: { fontSize: 19, lineHeight: 23, fontWeight: "700", fontFamily: "serif", textAlign: "center" },
  headingRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  headingCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2.2, marginBottom: 4 },
  sectionTitle: { fontSize: 24, lineHeight: 30, fontWeight: "700", fontFamily: "serif" },
  card: { borderWidth: 1, borderRadius: 22, padding: 18 },
  button: { minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  buttonCompact: { minHeight: 40, borderRadius: 13, paddingHorizontal: 13 },
  buttonText: { fontSize: 14, lineHeight: 18, fontWeight: "800", letterSpacing: 0.3 },
  buttonTextCompact: { fontSize: 12 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.86 },
  disabled: { opacity: 0.45 },
  metric: { flex: 1, minWidth: 92 },
  metricValue: { fontSize: 23, lineHeight: 28, fontWeight: "800" },
  metricLabel: { marginTop: 3, fontSize: 9, lineHeight: 12, fontWeight: "800", letterSpacing: 1.2 },
  empty: { alignItems: "center", paddingVertical: 38, paddingHorizontal: 24 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", marginBottom: 6 },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  progressTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
});

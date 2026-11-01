import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card } from "@/components/app-ui";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";

export default function LoginScreen() {
  const { palette } = useAppStore();
  const { login } = usePerformAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Enter your username or email and password.");
      return;
    }
    setSubmitting(true);
    const result = await login(identifier.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Login was not accepted.");
      return;
    }
    router.replace("/");
  };

  return (
    <AppScreen scroll contentStyle={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.top}><Pressable onPress={() => router.back()} accessibilityLabel="Close login" style={({ pressed }) => [styles.close, { borderColor: palette.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={23} color={palette.text} /></Pressable><BrandLockup compact /></View>
        <View style={styles.heading}><Text style={[styles.eyebrow, { color: palette.accent }]}>PRIVATE ACCESS</Text><Text style={[styles.title, { color: palette.text }]}>Welcome back.</Text><Text style={[styles.body, { color: palette.muted }]}>Log in to create scripts, rehearse, retain private progress, manage payment verification, and set a profile thumbnail.</Text></View>
        <Card style={styles.card}>
          <Text style={[styles.label, { color: palette.muted }]}>USERNAME OR EMAIL</Text>
          <TextInput value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="name or email" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]} />
          <Text style={[styles.label, { color: palette.muted }]}>PASSWORD</Text>
          <View style={[styles.passwordRow, { borderColor: palette.border, backgroundColor: palette.background }]}><TextInput key={passwordVisible ? "password-visible" : "password-hidden"} value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} autoCapitalize="none" onSubmitEditing={submit} returnKeyType="go" placeholder="Password" placeholderTextColor={palette.muted} style={[styles.passwordInput, { color: palette.text }]} /><Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} onPress={() => setPasswordVisible((visible) => !visible)} style={({ pressed }) => [styles.visibility, pressed && styles.pressed]}><MaterialIcons name={passwordVisible ? "visibility-off" : "visibility"} size={21} color={palette.accent} /></Pressable></View>
          {passwordVisible && password ? <Text selectable style={[styles.visiblePassword, { color: palette.accent, backgroundColor: palette.surfaceAlt }]}>Visible password: {password}</Text> : null}
          {error ? <View style={[styles.error, { borderColor: `${palette.danger}77`, backgroundColor: `${palette.danger}14` }]}><MaterialIcons name="error-outline" size={18} color={palette.danger} /><Text style={[styles.errorText, { color: palette.text }]}>{error}</Text></View> : null}
          <ActionButton label={submitting ? "Logging in…" : "Log in"} icon="login" disabled={submitting} onPress={submit} />
        </Card>
        <Card style={styles.registerCard}><Text style={[styles.registerTitle, { color: palette.text }]}>New to PERFORM AI?</Text><Text style={[styles.body, { color: palette.muted }]}>Create a private account, choose a subscription level, and receive a manual verification status.</Text><ActionButton label="Register" icon="person-add" kind="secondary" onPress={() => router.push("/register" as any)} /></Card>
        <Text style={[styles.note, { color: palette.muted }]}>Use the eye control to view your own password before submitting. PERFORM AI does not store plaintext passwords in the application.</Text>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 14, paddingBottom: 40 }, top: { flexDirection: "row", alignItems: "center", gap: 14 }, close: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, heading: { marginTop: 48, marginBottom: 25 }, eyebrow: { fontSize: 10, lineHeight: 14, letterSpacing: 2, fontWeight: "800", marginBottom: 8 }, title: { fontSize: 39, lineHeight: 45, fontFamily: "serif", fontWeight: "700", marginBottom: 9 }, body: { fontSize: 14, lineHeight: 21 }, card: { gap: 10 }, label: { fontSize: 10, lineHeight: 14, letterSpacing: 1.3, fontWeight: "800", marginTop: 3 }, input: { minHeight: 53, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 15 }, passwordRow: { minHeight: 53, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center" }, passwordInput: { flex: 1, minHeight: 51, paddingLeft: 15, fontSize: 15 }, visibility: { width: 49, minHeight: 51, alignItems: "center", justifyContent: "center" }, visiblePassword: { fontSize: 12, lineHeight: 18, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, error: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 13, padding: 11, marginTop: 4 }, errorText: { flex: 1, fontSize: 12, lineHeight: 18 }, registerCard: { gap: 9, marginTop: 14 }, registerTitle: { fontSize: 16, lineHeight: 21, fontWeight: "800" }, note: { marginTop: 18, fontSize: 11, lineHeight: 17, textAlign: "center" }, pressed: { opacity: 0.72 },
});

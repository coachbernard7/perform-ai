import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card } from "@/components/app-ui";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import { formatPlanAmount, formatPlanCycle, useSubscriptionCatalog } from "@/lib/subscription-catalog";

export default function RegisterScreen() {
  const { palette } = useAppStore();
  const { register } = usePerformAuth();
  const { plans } = useSubscriptionCatalog();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [plan, setPlan] = useState("pro");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError("Complete every field to create your account.");
      return;
    }
    setSubmitting(true);
    const result = await register({ name: name.trim(), username: username.trim(), email: email.trim(), password, plan });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Registration was not accepted.");
      return;
    }
    router.replace("/");
  };

  return <AppScreen scroll contentStyle={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.top}><Pressable onPress={() => router.back()} accessibilityLabel="Close registration" style={({ pressed }) => [styles.close, { borderColor: palette.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={23} color={palette.text} /></Pressable><BrandLockup compact /></View>
    <View style={styles.heading}><Text style={[styles.eyebrow, { color: palette.accent }]}>CREATE PRIVATE ACCESS</Text><Text style={[styles.title, { color: palette.text }]}>Start rehearsing.</Text><Text style={[styles.body, { color: palette.muted }]}>Choose a subscription level. Registration creates your private account; payment status is manually verified and is never activated automatically.</Text></View>
    <Card style={styles.card}>
      <Text style={[styles.label, { color: palette.muted }]}>YOUR NAME</Text><TextInput value={name} onChangeText={setName} autoCapitalize="words" placeholder="Your name" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]} />
      <Text style={[styles.label, { color: palette.muted }]}>USERNAME</Text><TextInput value={username} onChangeText={(value) => setUsername(value.toLowerCase())} autoCapitalize="none" autoCorrect={false} placeholder="lowercase username" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]} />
      <Text style={[styles.label, { color: palette.muted }]}>EMAIL</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={palette.muted} style={[styles.input, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]} />
      <Text style={[styles.label, { color: palette.muted }]}>PASSWORD</Text><View style={[styles.passwordRow, { borderColor: palette.border, backgroundColor: palette.background }]}><TextInput key={passwordVisible ? "registration-password-visible" : "registration-password-hidden"} value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} autoCapitalize="none" onSubmitEditing={submit} returnKeyType="go" placeholder="At least 10 characters" placeholderTextColor={palette.muted} style={[styles.passwordInput, { color: palette.text }]} /><Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? "Hide password" : "Show password"} onPress={() => setPasswordVisible((visible) => !visible)} style={({ pressed }) => [styles.visibility, pressed && styles.pressed]}><MaterialIcons name={passwordVisible ? "visibility-off" : "visibility"} size={21} color={palette.accent} /></Pressable></View>
      {passwordVisible && password ? <Text selectable style={[styles.visiblePassword, { color: palette.accent, backgroundColor: palette.surfaceAlt }]}>Visible password: {password}</Text> : null}
      <Text style={[styles.label, { color: palette.muted }]}>SUBSCRIPTION LEVEL</Text><View style={styles.planGrid}>{plans.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => setPlan(item.id)} style={({ pressed }) => [styles.plan, { borderColor: item.id === plan ? palette.primary : palette.border, backgroundColor: item.id === plan ? `${palette.primary}18` : palette.surface }, pressed && styles.pressed]}><Text style={[styles.planName, { color: item.id === plan ? palette.primary : palette.text }]}>{item.label}</Text><Text style={[styles.planPrice, { color: palette.muted }]}>{formatPlanAmount(item)} · {formatPlanCycle(item.cycle)}</Text></Pressable>)}</View>
      {error ? <View style={[styles.error, { borderColor: `${palette.danger}77`, backgroundColor: `${palette.danger}14` }]}><MaterialIcons name="error-outline" size={18} color={palette.danger} /><Text style={[styles.errorText, { color: palette.text }]}>{error}</Text></View> : null}
      <ActionButton label={submitting ? "Creating account…" : "Create account"} icon="person-add" disabled={submitting} onPress={submit} />
    </Card>
    <Text style={[styles.note, { color: palette.muted }]}>Your password is bcrypt-hashed in private storage. Selecting a plan records your choice; payment proof remains subject to manual verification.</Text>
  </KeyboardAvoidingView></AppScreen>;
}

const styles = StyleSheet.create({
  screen: { paddingTop: 14, paddingBottom: 40 }, top: { flexDirection: "row", alignItems: "center", gap: 14 }, close: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, heading: { marginTop: 40, marginBottom: 24 }, eyebrow: { fontSize: 10, lineHeight: 14, letterSpacing: 2, fontWeight: "800", marginBottom: 8 }, title: { fontSize: 37, lineHeight: 43, fontFamily: "serif", fontWeight: "700", marginBottom: 9 }, body: { fontSize: 13, lineHeight: 20 }, card: { gap: 10 }, label: { fontSize: 10, lineHeight: 14, letterSpacing: 1.3, fontWeight: "800", marginTop: 3 }, input: { minHeight: 53, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 15 }, passwordRow: { minHeight: 53, borderWidth: 1, borderRadius: 15, flexDirection: "row", alignItems: "center" }, passwordInput: { flex: 1, minHeight: 51, paddingLeft: 15, fontSize: 15 }, visibility: { width: 49, minHeight: 51, alignItems: "center", justifyContent: "center" }, visiblePassword: { fontSize: 12, lineHeight: 18, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, planGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, plan: { width: "31%", minWidth: 98, borderWidth: 1, borderRadius: 15, padding: 10 }, planName: { fontSize: 12, lineHeight: 17, fontWeight: "800" }, planPrice: { fontSize: 10, lineHeight: 15, marginTop: 2 }, error: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 13, padding: 11, marginTop: 4 }, errorText: { flex: 1, fontSize: 12, lineHeight: 18 }, note: { marginTop: 18, fontSize: 11, lineHeight: 17, textAlign: "center" }, pressed: { opacity: 0.72 },
});

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card, SectionHeading } from "@/components/app-ui";
import { THEME_LABELS, THEME_PALETTES, useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import type { ThemeName } from "@/lib/app-types";

const VISIBLE_THEMES: ThemeName[] = ["blue", "black-gold", "black-blue", "white"];

export default function ProfileScreen() {
  const { palette, settings, updateSettings, scripts, sessions } = useAppStore();
  const { ready, account, isAuthenticated, logout, uploadThumbnail } = usePerformAuth();
  const [fillerText, setFillerText] = useState(settings.fillerWords.join(", "));
  const [uploading, setUploading] = useState(false);
  const saveFillers = () => {
    const fillerWords = [...new Set(fillerText.split(",").map((word) => word.trim().toLowerCase()).filter(Boolean))].slice(0, 50);
    if (fillerWords.length) updateSettings({ fillerWords });
  };

  const chooseThumbnail = async () => {
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, base64: Platform.OS === "web", quality: 0.8 });
      if (selected.canceled) return;
      const asset = selected.assets[0];
      const source = Platform.OS === "web" && asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri;
      const side = Math.min(asset.width ?? 128, asset.height ?? 128);
      const cropX = Math.max(0, Math.floor(((asset.width ?? side) - side) / 2));
      const cropY = Math.max(0, Math.floor(((asset.height ?? side) - side) / 2));
      const thumbnail = await ImageManipulator.manipulateAsync(source, [{ crop: { originX: cropX, originY: cropY, width: side, height: side } }, { resize: { width: 128, height: 128 } }], { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG });
      setUploading(true);
      const result = await uploadThumbnail(thumbnail.uri, "image/jpeg");
      setUploading(false);
      if (!result.ok) Alert.alert("Profile thumbnail", result.error ?? "The thumbnail could not be saved.");
    } catch (error) {
      setUploading(false);
      Alert.alert("Profile thumbnail", error instanceof Error ? error.message : "Choose a valid image to create a low-resolution thumbnail.");
    }
  };

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <AppScreen scroll>
      <BrandLockup compact />
      <View style={styles.section}><SectionHeading eyebrow="Your space" title="Appearance & settings" /></View>

      <Card style={styles.guardianCard}>
        <View style={[styles.avatar, { backgroundColor: `${palette.primary}1C`, borderColor: `${palette.primary}55` }]}>
          {isAuthenticated && account?.thumbnailUrl ? <Image source={{ uri: account.thumbnailUrl }} style={styles.avatarImage} /> : <MaterialIcons name={isAuthenticated ? "person" : "visibility"} size={29} color={palette.primary} />}
        </View>
        <View style={styles.guardianCopy}>
          <Text style={[styles.guardianTitle, { color: palette.text }]}>{isAuthenticated ? account?.name ?? "Member profile" : "Visitor preview"}</Text>
          <Text style={[styles.body, { color: palette.muted }]}>{isAuthenticated ? `${account?.role === "admin" ? "Administrator" : "Member"} · ${scripts.length} scripts · ${sessions.length} practice sessions` : "Explore the app. Log in to create, practise, and save private material."}</Text>
        </View>
      </Card>

      {!ready ? null : isAuthenticated ? <Card style={styles.accountCard}>
        <View style={styles.accountHeader}><View><Text style={[styles.settingTitle, { color: palette.text }]}>Account access</Text><Text style={[styles.body, { color: palette.muted }]}>{account?.username} · {account?.email}</Text></View><View style={[styles.rolePill, { backgroundColor: `${account?.membership === "pending_manual_verification" ? palette.warning : palette.success}18` }]}><Text style={[styles.roleText, { color: account?.membership === "pending_manual_verification" ? palette.warning : palette.success }]}>{account?.membership === "permanent_free_trial" ? "PERMANENT FREE TRIAL" : account?.membership === "pending_manual_verification" ? "PLAN PENDING" : account?.role?.toUpperCase()}</Text></View></View>
        {account?.membership === "pending_manual_verification" ? <Text style={[styles.body, { color: palette.warning }]}>Selected plan: {account.selectedPlan?.toUpperCase() ?? "PENDING"}. Submit payment proof only if requested; activation is manual.</Text> : null}
        {account?.role === "admin" ? <ActionButton label="Subscription administration" icon="admin-panel-settings" kind="secondary" onPress={() => router.push("/admin-subscriptions" as any)} /> : null}
        <Text style={[styles.thumbnailNote, { color: palette.muted }]}>Profile photos are centre-cropped and converted to a 128 × 128 JPEG before upload. The original image is never retained by PERFORM AI.</Text>
        <View style={styles.accountActions}><ActionButton compact label={uploading ? "Saving…" : account?.thumbnailUrl ? "Replace thumbnail" : "Set thumbnail"} icon="photo-camera" kind="secondary" disabled={uploading} onPress={chooseThumbnail} /><ActionButton compact label="Log out" icon="logout" kind="ghost" onPress={signOut} /></View>
      </Card> : <Card style={styles.accountCard}>
        <Text style={[styles.settingTitle, { color: palette.text }]}>Log in for private rehearsal</Text><Text style={[styles.body, { color: palette.muted }]}>A session is required before script uploads, rehearsal, saved history, membership verification, or profile photos.</Text><ActionButton label="Log in" icon="login" onPress={() => router.push("/login" as any)} />
      </Card>}

      <Text style={[styles.label, { color: palette.muted }]}>BACKGROUND / THEME</Text>
      <View style={styles.themeGrid}>{VISIBLE_THEMES.map((theme) => { const sample = THEME_PALETTES[theme]; const selected = settings.theme === theme; return <Card key={theme} style={{ ...styles.themeCard, borderColor: selected ? palette.primary : palette.border }}><Text onPress={() => updateSettings({ theme })} style={[styles.themeHit, { color: sample.text, backgroundColor: sample.background }]}><Text style={{ color: sample.primary }}>● </Text>{THEME_LABELS[theme]}</Text>{selected ? <MaterialIcons name="check-circle" size={19} color={palette.primary} style={styles.check} /> : null}</Card>; })}</View>

      <Text style={[styles.label, { color: palette.muted }]}>REHEARSAL</Text>
      <Card style={styles.settingsCard}>
        <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: palette.text }]}>Dark mode</Text><Text style={[styles.body, { color: palette.muted }]}>Switch between white with black-and-blue text and black with gold text.</Text></View><Switch value={settings.theme !== "white"} onValueChange={(enabled) => updateSettings({ theme: enabled ? "black-gold" : "white" })} trackColor={{ false: palette.border, true: `${palette.primary}88` }} thumbColor={settings.theme !== "white" ? palette.primary : palette.muted} /></View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: palette.text }]}>Default Focus Mode</Text><Text style={[styles.body, { color: palette.muted }]}>Maximise script size and reduce visual noise during practice.</Text></View><Switch value={settings.focusMode} onValueChange={(focusMode) => updateSettings({ focusMode })} trackColor={{ false: palette.border, true: `${palette.primary}88` }} thumbColor={settings.focusMode ? palette.primary : palette.muted} /></View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.settingRow}><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: palette.text }]}>Reduce animation</Text><Text style={[styles.body, { color: palette.muted }]}>Keep movement subtle across the interface.</Text></View><Switch value={settings.reduceMotion} onValueChange={(reduceMotion) => updateSettings({ reduceMotion })} trackColor={{ false: palette.border, true: `${palette.primary}88` }} thumbColor={settings.reduceMotion ? palette.primary : palette.muted} /></View>
      </Card>

      {isAuthenticated ? <><Text style={[styles.label, { color: palette.muted }]}>SPEECH ANALYSIS</Text><Card style={styles.settingsCard}><Text style={[styles.settingTitle, { color: palette.text }]}>Filler words and phrases</Text><Text style={[styles.body, { color: palette.muted }]}>Separate entries with commas. New analysed rehearsals use this list.</Text><TextInput value={fillerText} onChangeText={setFillerText} onBlur={saveFillers} onSubmitEditing={saveFillers} returnKeyType="done" multiline placeholder="um, uh, erm, you know" placeholderTextColor={palette.muted} style={[styles.fillerInput, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]} /></Card></> : null}

      <Text style={[styles.label, { color: palette.muted }]}>PERFORM AI</Text><Card><Text style={[styles.settingTitle, { color: palette.text }]}>Private by default</Text><Text style={[styles.body, { color: palette.muted }]}>Your scripts, transcripts, and rehearsal history stay local. Recording analysis begins only when you choose it after logging in.</Text><View style={[styles.versionPill, { backgroundColor: palette.surfaceAlt }]}><Text style={[styles.version, { color: palette.accent }]}>AUTHENTICATED GATEWAY · 1.1</Text></View></Card>
      {isAuthenticated ? <Pressable onPress={() => router.push("/payments")} style={({ pressed }) => [styles.paymentLink, { borderColor: palette.border }, pressed && styles.pressed]}><View style={styles.paymentCopy}><Text style={[styles.settingTitle, { color: palette.text }]}>Membership & verification</Text><Text style={[styles.body, { color: palette.muted }]}>Crypto, Revolut, TXID, and payment-proof options.</Text></View><MaterialIcons name="arrow-forward" size={21} color={palette.accent} /></Pressable> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 }, guardianCard: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }, avatar: { width: 56, height: 56, borderRadius: 19, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" }, avatarImage: { width: 56, height: 56 }, guardianCopy: { flex: 1 }, guardianTitle: { fontSize: 16, lineHeight: 21, fontWeight: "800", marginBottom: 4 }, body: { fontSize: 12, lineHeight: 19 }, label: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.6, marginBottom: 10, marginTop: 24 }, themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 2 }, themeCard: { width: "48.5%", padding: 6, borderRadius: 17 }, themeHit: { overflow: "hidden", borderRadius: 12, paddingVertical: 16, paddingHorizontal: 10, fontSize: 11, fontWeight: "800" }, check: { position: "absolute", right: 9, top: 8 }, settingsCard: { gap: 16, marginBottom: 2 }, fillerInput: { minHeight: 82, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, lineHeight: 19 }, settingRow: { flexDirection: "row", alignItems: "center", gap: 14 }, settingCopy: { flex: 1 }, settingTitle: { fontSize: 14, lineHeight: 19, fontWeight: "700", marginBottom: 3 }, divider: { height: 1 }, versionPill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, marginTop: 14 }, version: { fontSize: 9, lineHeight: 12, fontWeight: "800", letterSpacing: 1.1 }, paymentLink: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 16, marginBottom: 36 }, paymentCopy: { flex: 1 }, pressed: { opacity: 0.72 }, accountCard: { gap: 13 }, accountHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, rolePill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 }, roleText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 }, thumbnailNote: { fontSize: 11, lineHeight: 17 }, accountActions: { flexDirection: "row", gap: 9 },
});

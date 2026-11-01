import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card, EmptyState, SectionHeading } from "@/components/app-ui";
import { PrivateContentGate } from "@/components/auth-gate";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import type { ScriptDocument } from "@/lib/app-types";
import { countWords, formatDuration } from "@/lib/rehearsal";

export default function FilesScreen() {
  const { palette, scripts, deleteScript } = useAppStore();
  const { ready, isAuthenticated } = usePerformAuth();

  if (!ready || !isAuthenticated) {
    return <AppScreen><BrandLockup compact /><PrivateContentGate title="Your private library is locked." body="Log in to view, import, and manage the scripts stored on this device." /></AppScreen>;
  }

  const remove = (script: ScriptDocument) => {
    if (script.id === "welcome-script") {
      Alert.alert("Starter script", "The starter script stays in your library so you always have something to rehearse.");
      return;
    }
    Alert.alert("Delete script?", `Delete “${script.title}” and its practice history?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteScript(script.id) },
    ]);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <BrandLockup compact />
        <SectionHeading eyebrow="Library" title="Your scripts" />
        <View style={styles.actions}>
          <ActionButton label="Add or import" icon="add" onPress={() => router.push("/script/new")} />
        </View>
      </View>
      <FlatList
        data={scripts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="description" title="No scripts yet" body="Paste your first speech or import TXT, PDF, DOCX, or PPTX to begin." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/rehearse", params: { scriptId: item.id, mode: "full" } })}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card style={styles.card}>
              <View style={[styles.docIcon, { backgroundColor: `${palette.primary}14` }]}>
                <MaterialIcons name="article" size={25} color={palette.primary} />
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{item.title}</Text>
                <Text style={[styles.meta, { color: palette.muted }]}>{countWords(item.content)} words · Target {formatDuration(item.targetSeconds)}{item.sourceFormat ? ` · ${item.sourceFormat.toUpperCase()}` : ""}{item.slides?.length ? ` · ${item.slides.length} slides` : ""}</Text>
                <Text numberOfLines={2} style={[styles.preview, { color: palette.muted }]}>{item.content}</Text>
              </View>
              <Pressable accessibilityLabel={`Delete ${item.title}`} onPress={() => remove(item)} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <MaterialIcons name="more-vert" size={22} color={palette.muted} />
              </Pressable>
            </Card>
          </Pressable>
        )}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 24 },
  actions: { marginTop: -4 },
  list: { gap: 12, paddingTop: 18, paddingBottom: 120 },
  card: { flexDirection: "row", gap: 13, alignItems: "flex-start" },
  docIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: "700", marginBottom: 3 },
  meta: { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  preview: { fontSize: 13, lineHeight: 19 },
  iconButton: { width: 34, height: 38, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.65 },
});

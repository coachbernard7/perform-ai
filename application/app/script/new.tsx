import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card } from "@/components/app-ui";
import { PrivateContentGate } from "@/components/auth-gate";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import { composeSlideText, extractDocument, type ImportedDocument, type SlideImportChoice } from "@/lib/document-import";
import { countWords } from "@/lib/rehearsal";

const DOCUMENT_TYPES = [
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

function titleFromFilename(name: string): string {
  return name.replace(/\.(txt|pdf|docx|pptx)$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

export default function NewScriptScreen() {
  const { palette, addScript } = useAppStore();
  const { ready, isAuthenticated } = usePerformAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetMinutes, setTargetMinutes] = useState("3");
  const [importing, setImporting] = useState(false);
  const [importedDocument, setImportedDocument] = useState<ImportedDocument | null>(null);
  const [slideChoice, setSlideChoice] = useState<SlideImportChoice>("slides+notes");

  if (!ready || !isAuthenticated) {
    return <AppScreen><View style={styles.topbar}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: palette.border }, pressed && styles.pressed]}><MaterialIcons name="close" size={23} color={palette.text} /></Pressable><BrandLockup compact /></View><PrivateContentGate title="Script creation is protected." body="Log in before pasting, importing, or saving your private rehearsal material." /></AppScreen>;
  }

  const importFile = async () => {
    try {
      setImporting(true);
      const result = await DocumentPicker.getDocumentAsync({ type: DOCUMENT_TYPES, copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const document = await extractDocument({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, file: asset.file });
      const choice: SlideImportChoice = "slides+notes";
      setImportedDocument(document);
      setSlideChoice(choice);
      setContent(document.slides ? composeSlideText(document.slides, choice) : document.text);
      if (!title.trim()) setTitle(titleFromFilename(document.sourceFilename));
    } catch (error) {
      Alert.alert("Could not import document", error instanceof Error ? error.message : "Choose a TXT, PDF, DOCX, or PPTX file.");
    } finally {
      setImporting(false);
    }
  };

  const changeSlideChoice = (choice: SlideImportChoice) => {
    setSlideChoice(choice);
    if (importedDocument?.slides) setContent(composeSlideText(importedDocument.slides, choice));
  };

  const createScript = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Add your script", "Give the script a title and paste or import its text.");
      return;
    }
    const minutes = Number(targetMinutes);
    const importMetadata = importedDocument ? {
      sourceFormat: importedDocument.sourceFormat,
      sourceFilename: importedDocument.sourceFilename,
      extractionWarnings: importedDocument.extractionWarnings,
      slides: importedDocument.slides,
    } : {};
    const script = addScript({
      title: title.trim(),
      content: content.trim(),
      targetSeconds: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 180,
      ...importMetadata,
    });
    router.replace({ pathname: "/rehearse", params: { scriptId: script.id, mode: importedDocument?.slides?.length ? "presentation" : "full" } });
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.topbar}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, { borderColor: palette.border }, pressed && styles.pressed]}>
              <MaterialIcons name="close" size={23} color={palette.text} />
            </Pressable>
            <BrandLockup compact />
          </View>

          <View style={styles.titleBlock}>
            <Text style={[styles.eyebrow, { color: palette.accent }]}>PREPARE YOUR MATERIAL</Text>
            <Text style={[styles.title, { color: palette.text }]}>Add a script</Text>
            <Text style={[styles.body, { color: palette.muted }]}>Paste text or import a TXT, PDF, DOCX, or PowerPoint file. Review and edit the extracted text before rehearsing.</Text>
          </View>

          <Card style={styles.importCard}>
            <View style={[styles.importIcon, { backgroundColor: `${palette.accent}14` }]}>
              <MaterialIcons name="upload-file" size={27} color={palette.accent} />
            </View>
            <View style={styles.importCopy}>
              <Text style={[styles.importTitle, { color: palette.text }]}>Import a document</Text>
              <Text style={[styles.small, { color: palette.muted }]}>TXT, PDF, DOCX, and PPTX. PowerPoint speaker notes are included when available.</Text>
            </View>
            <ActionButton compact label={importing ? "Importing…" : "Choose"} kind="secondary" disabled={importing} onPress={importFile} />
          </Card>

          {importedDocument ? (
            <Card style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewIcon}>
                  <MaterialIcons name="fact-check" size={20} color={palette.accent} />
                </View>
                <View style={styles.importCopy}>
                  <Text style={[styles.importTitle, { color: palette.text }]}>Review import</Text>
                  <Text numberOfLines={1} style={[styles.small, { color: palette.muted }]}>{importedDocument.sourceFilename} · {importedDocument.sourceFormat.toUpperCase()}</Text>
                </View>
                {importedDocument.slides ? <Text style={[styles.slideCount, { color: palette.accent }]}>{importedDocument.slides.length} SLIDES</Text> : null}
              </View>

              {importedDocument.slides ? (
                <>
                  <Text style={[styles.reviewLabel, { color: palette.muted }]}>ADD TO EDITOR</Text>
                  <View style={styles.choiceRow}>
                    {([
                      ["slides+notes", "Slides + Notes"],
                      ["slides", "Slides"],
                      ["notes", "Notes"],
                    ] as const).map(([choice, label]) => {
                      const selected = choice === slideChoice;
                      return (
                        <Pressable
                          key={choice}
                          accessibilityRole="button"
                          accessibilityLabel={`Use ${label}`}
                          onPress={() => changeSlideChoice(choice)}
                          style={({ pressed }) => [styles.choice, { borderColor: selected ? palette.accent : palette.border, backgroundColor: selected ? `${palette.accent}16` : palette.surfaceAlt }, pressed && styles.pressed]}
                        >
                          <Text style={[styles.choiceText, { color: selected ? palette.text : palette.muted }]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={[styles.small, styles.reviewHint, { color: palette.muted }]}>Changing this choice replaces the editor with the selected slide content. You can then edit it below.</Text>
                </>
              ) : <Text style={[styles.small, { color: palette.muted }]}>The extracted text is ready to edit below.</Text>}

              {importedDocument.extractionWarnings.length ? (
                <View style={[styles.warning, { borderColor: `${palette.warning}66`, backgroundColor: `${palette.warning}12` }]}>
                  <MaterialIcons name="warning-amber" size={17} color={palette.warning} />
                  <Text style={[styles.warningText, { color: palette.text }]}>{importedDocument.extractionWarnings.join(" ")}</Text>
                </View>
              ) : null}
            </Card>
          ) : null}

          <Text style={[styles.label, { color: palette.muted }]}>SCRIPT TITLE</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Conference keynote"
            placeholderTextColor={palette.muted}
            selectionColor={palette.accent}
            style={[styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
          />

          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: palette.muted }]}>SCRIPT TEXT</Text>
            <Text style={[styles.counter, { color: palette.accent }]}>{countWords(content)} WORDS</Text>
          </View>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Paste your speech, sermon, presentation notes, or scene here…"
            placeholderTextColor={palette.muted}
            selectionColor={palette.accent}
            multiline
            textAlignVertical="top"
            style={[styles.textarea, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
          />

          <Text style={[styles.label, { color: palette.muted }]}>TARGET DURATION (MINUTES)</Text>
          <TextInput
            value={targetMinutes}
            onChangeText={setTargetMinutes}
            keyboardType="decimal-pad"
            placeholder="3"
            placeholderTextColor={palette.muted}
            selectionColor={palette.accent}
            style={[styles.input, styles.durationInput, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
          />

          <ActionButton label="Save & rehearse" icon="arrow-forward" onPress={createScript} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 50 },
  topbar: { flexDirection: "row", alignItems: "center", gap: 14 },
  back: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleBlock: { marginTop: 28, marginBottom: 20 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 7 },
  title: { fontSize: 36, lineHeight: 42, fontFamily: "serif", fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21 },
  importCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  importIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  importCopy: { flex: 1, minWidth: 0 },
  importTitle: { fontSize: 14, lineHeight: 19, fontWeight: "700", marginBottom: 2 },
  small: { fontSize: 10, lineHeight: 15 },
  reviewCard: { marginBottom: 24, gap: 12 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reviewLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  slideCount: { fontSize: 9, fontWeight: "800", letterSpacing: 0.9 },
  choiceRow: { flexDirection: "row", gap: 7 },
  choice: { flex: 1, minHeight: 39, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  choiceText: { fontSize: 10, lineHeight: 13, fontWeight: "800", textAlign: "center" },
  reviewHint: { marginTop: -4 },
  warning: { flexDirection: "row", gap: 7, alignItems: "flex-start", borderWidth: 1, borderRadius: 11, padding: 10 },
  warningText: { flex: 1, fontSize: 10, lineHeight: 15 },
  label: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  counter: { fontSize: 9, lineHeight: 13, fontWeight: "800", letterSpacing: 1 },
  input: { minHeight: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  textarea: { minHeight: 240, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, lineHeight: 25 },
  durationInput: { marginBottom: 24 },
  pressed: { opacity: 0.7 },
});

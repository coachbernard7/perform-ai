import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card, SectionHeading } from "@/components/app-ui";
import { PrivateContentGate } from "@/components/auth-gate";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import type { RehearsalMode } from "@/lib/app-types";
import { MODE_DESCRIPTIONS, MODE_LABELS, countWords, getWeakSectionIndexes } from "@/lib/rehearsal";

const TRAINING_MODES: RehearsalMode[] = ["full", "first-letter", "keywords", "blind", "progressive", "presentation", "speaker-notes"];

const MODE_ICONS: Record<RehearsalMode, keyof typeof MaterialIcons.glyphMap> = {
  full: "notes",
  "first-letter": "spellcheck",
  keywords: "key",
  blind: "visibility-off",
  progressive: "unfold-more",
  presentation: "present-to-all",
  "speaker-notes": "speaker-notes",
};

function modeAction(mode: RehearsalMode, scriptId: string) {
  router.push({ pathname: "/rehearse", params: { scriptId, mode } });
}

export default function TrainScreen() {
  const { palette, scripts, sessions } = useAppStore();
  const { ready, isAuthenticated } = usePerformAuth();
  const [scriptId, setScriptId] = useState(scripts[0]?.id ?? "");
  const [mode, setMode] = useState<RehearsalMode>("full");
  const script = scripts.find((item) => item.id === scriptId) ?? scripts[0];
  const weakSectionIndexes = useMemo(() => (script ? getWeakSectionIndexes(sessions, script.id) : []), [script, sessions]);

  if (!ready || !isAuthenticated) {
    return <AppScreen scroll><BrandLockup compact /><View style={styles.section}><SectionHeading eyebrow="Training preview" title="Choose your challenge" /></View><View style={styles.modeGrid}>{TRAINING_MODES.slice(0, 4).map((item) => <Card key={item} style={styles.modeCard}><View style={[styles.modeIcon, { backgroundColor: `${palette.primary}22` }]}><MaterialIcons name={MODE_ICONS[item]} size={24} color={palette.primary} /></View><Text style={[styles.modeTitle, { color: palette.text }]}>{MODE_LABELS[item]}</Text><Text style={[styles.modeBody, { color: palette.muted }]}>{MODE_DESCRIPTIONS[item]}</Text></Card>)}</View><PrivateContentGate title="Ready to practise?" body="Log in to select a private script, begin rehearsal, and keep your progress on this device." /></AppScreen>;
  }

  return (
    <AppScreen scroll>
      <BrandLockup compact />
      <View style={styles.section}>
        <SectionHeading eyebrow="Training setup" title="Choose your challenge" />
      </View>

      <Text style={[styles.label, { color: palette.muted }]}>SCRIPT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scriptRow}>
        {scripts.map((item) => {
          const selected = item.id === script?.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setScriptId(item.id)}
              style={({ pressed }) => [
                styles.scriptChip,
                { backgroundColor: selected ? `${palette.primary}20` : palette.surface, borderColor: selected ? palette.primary : palette.border },
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name={selected ? "radio-button-checked" : "radio-button-unchecked"} size={17} color={selected ? palette.primary : palette.muted} />
              <Text numberOfLines={1} style={[styles.scriptChipText, { color: selected ? palette.text : palette.muted }]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.label, { color: palette.muted }]}>REHEARSAL MODE</Text>
      <View style={styles.modeGrid}>
        {TRAINING_MODES.map((item) => {
          const selected = item === mode;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${MODE_LABELS[item]} rehearsal mode`}
              onPress={() => setMode(item)}
              style={({ pressed }) => [styles.modeWrap, pressed && styles.pressed]}
            >
              <Card style={{ ...styles.modeCard, borderColor: selected ? palette.primary : palette.border }}>
                <View style={[styles.modeIcon, { backgroundColor: selected ? `${palette.primary}22` : palette.surfaceAlt }]}>
                  <MaterialIcons name={MODE_ICONS[item]} size={24} color={selected ? palette.primary : palette.accent} />
                </View>
                <Text style={[styles.modeTitle, { color: palette.text }]}>{MODE_LABELS[item]}</Text>
                <Text style={[styles.modeBody, { color: palette.muted }]}>{MODE_DESCRIPTIONS[item]}</Text>
                {selected ? <View style={[styles.selectedDot, { backgroundColor: palette.primary }]} /> : null}
              </Card>
            </Pressable>
          );
        })}
      </View>

      {script ? (
        <>
          <Card style={styles.summary}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryTitle, { color: palette.text }]} numberOfLines={1}>{script.title}</Text>
                <Text style={[styles.summaryMeta, { color: palette.muted }]}>{countWords(script.content)} words · {MODE_LABELS[mode]}</Text>
              </View>
              <MaterialIcons name="verified" size={22} color={palette.success} />
            </View>
            <ActionButton label="Begin rehearsal" icon="play-arrow" onPress={() => modeAction(mode, script.id)} />
          </Card>

          <Card style={styles.weakCard}>
            <View style={[styles.toolIcon, { backgroundColor: `${palette.warning}1A` }]}>
              <MaterialIcons name="repeat" size={22} color={palette.warning} />
            </View>
            <View style={styles.toolCopy}>
              <Text style={[styles.toolTitle, { color: palette.text }]}>Practise weak sections</Text>
              <Text style={[styles.toolBody, { color: palette.muted }]}>
                {weakSectionIndexes.length
                  ? `Focus on ${weakSectionIndexes.map((index) => `section ${index + 1}`).join(", ")} from recent rehearsal coverage.`
                  : "Complete a rehearsal to identify the sections that need another pass."}
              </Text>
            </View>
            {weakSectionIndexes.length ? (
              <ActionButton
                compact
                label="Practise"
                icon="play-arrow"
                onPress={() => router.push({ pathname: "/rehearse", params: { scriptId: script.id, mode: "full", sections: weakSectionIndexes.join(",") } })}
              />
            ) : null}
          </Card>

          <View style={styles.prepHeading}>
            <SectionHeading eyebrow="Prepare offline" title="Test your recall" />
          </View>
          <View style={styles.prepGrid}>
            <Card style={styles.prepCard}>
              <View style={[styles.modeIcon, { backgroundColor: `${palette.accent}18` }]}>
                <MaterialIcons name="quiz" size={24} color={palette.accent} />
              </View>
              <Text style={[styles.prepTitle, { color: palette.text }]}>Practice questions</Text>
              <Text style={[styles.prepBody, { color: palette.muted }]}>Answer script-derived prompts, reveal the cue, and rate your recall.</Text>
              <ActionButton compact label="Open questions" icon="arrow-forward" kind="secondary" onPress={() => router.push({ pathname: "/practice-questions", params: { scriptId: script.id } })} />
            </Card>
            <Card style={styles.prepCard}>
              <View style={[styles.modeIcon, { backgroundColor: `${palette.primary}18` }]}>
                <MaterialIcons name="forum" size={24} color={palette.primary} />
              </View>
              <Text style={[styles.prepTitle, { color: palette.text }]}>Audience simulation</Text>
              <Text style={[styles.prepBody, { color: palette.muted }]}>Face four audience personas, their reactions, and a focused question.</Text>
              <ActionButton compact label="Meet audience" icon="arrow-forward" kind="secondary" onPress={() => router.push({ pathname: "/audience-simulation", params: { scriptId: script.id } })} />
            </Card>
          </View>
        </>
      ) : (
        <ActionButton label="Add your first script" icon="add" onPress={() => router.push("/script/new")} />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  label: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.6, marginBottom: 10, marginTop: 8 },
  scriptRow: { gap: 9, paddingBottom: 20 },
  scriptChip: { maxWidth: 220, height: 44, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 },
  scriptChipText: { flexShrink: 1, fontSize: 13, fontWeight: "700" },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modeWrap: { width: "48.5%" },
  modeCard: { minHeight: 192, padding: 15 },
  modeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  modeTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800", marginBottom: 6 },
  modeBody: { fontSize: 12, lineHeight: 18 },
  selectedDot: { position: "absolute", right: 12, top: 12, width: 8, height: 8, borderRadius: 4 },
  summary: { marginTop: 20, gap: 16 },
  summaryTop: { flexDirection: "row", alignItems: "center" },
  summaryCopy: { flex: 1 },
  summaryTitle: { fontSize: 16, lineHeight: 21, fontWeight: "700" },
  summaryMeta: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  weakCard: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  toolIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  toolCopy: { flex: 1 },
  toolTitle: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  toolBody: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  prepHeading: { marginTop: 26 },
  prepGrid: { gap: 10 },
  prepCard: { minHeight: 214, padding: 16 },
  prepTitle: { fontSize: 16, lineHeight: 21, fontWeight: "800", marginBottom: 6 },
  prepBody: { flex: 1, fontSize: 12, lineHeight: 18, marginBottom: 15 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
});

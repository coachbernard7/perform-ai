import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card, ProgressBar, SectionHeading } from "@/components/app-ui";
import { useAppStore } from "@/lib/app-store";
import { splitSections } from "@/lib/rehearsal";

type Persona = {
  name: string;
  role: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tone: "supportive" | "skeptical" | "direct" | "curious";
  reaction: (cue: string) => string;
  question: (cue: string) => string;
  responseCue: (section: string) => string;
};

const PERSONAS: Persona[] = [
  {
    name: "Supportive colleague",
    role: "Encouraging listener",
    icon: "groups",
    tone: "supportive",
    reaction: (cue) => `“I can see why ${cue} matters. I am ready for a clear next step.”`,
    question: (cue) => `What do you want me to do differently after hearing your point about ${cue}?`,
    responseCue: (section) => `Return to the practical action in this section: ${section}`,
  },
  {
    name: "Skeptical decision-maker",
    role: "Evidence-focused listener",
    icon: "business-center",
    tone: "skeptical",
    reaction: (cue) => `“The idea around ${cue} is interesting, but I need a reason to believe it.”`,
    question: (cue) => `What evidence or concrete example makes your case for ${cue} credible?`,
    responseCue: (section) => `Ground your answer in the clearest claim already in your script: ${section}`,
  },
  {
    name: "Time-pressed executive",
    role: "Outcome-oriented listener",
    icon: "schedule",
    tone: "direct",
    reaction: (cue) => `“I am following, but I need the value of ${cue} in one sentence.”`,
    question: (cue) => `If we remember only one thing about ${cue}, what is it and why does it matter now?`,
    responseCue: (section) => `Lead with the headline, then stop: ${section}`,
  },
  {
    name: "Curious newcomer",
    role: "Needs plain language",
    icon: "school",
    tone: "curious",
    reaction: (cue) => `“I am interested in ${cue}, but I may need one more bridge to follow.”`,
    question: (cue) => `Could you explain ${cue} in simple terms for someone hearing this for the first time?`,
    responseCue: (section) => `Use the simplest language from your own script: ${section}`,
  },
];

function cueFrom(section: string) {
  const words = section.match(/[A-Za-z0-9'’-]{4,}/g) ?? [];
  return words.sort((left, right) => right.length - left.length)[0] ?? "your main message";
}

export default function AudienceSimulationScreen() {
  const params = useLocalSearchParams<{ scriptId?: string }>();
  const { palette, scripts } = useAppStore();
  const [selectedScriptId, setSelectedScriptId] = useState(params.scriptId ?? "");
  const [personaIndex, setPersonaIndex] = useState(0);
  const [showResponseCue, setShowResponseCue] = useState(false);

  const script = scripts.find((item) => item.id === selectedScriptId) ?? scripts[0];
  const sections = useMemo(() => splitSections(script?.content ?? ""), [script?.content]);
  const persona = PERSONAS[personaIndex];
  const sectionIndex = sections.length ? personaIndex % sections.length : 0;
  const section = sections[sectionIndex] ?? "";
  const cue = cueFrom(section);

  const movePersona = (nextIndex: number) => {
    setPersonaIndex(Math.max(0, Math.min(PERSONAS.length - 1, nextIndex)));
    setShowResponseCue(false);
  };

  if (!script || !sections.length) {
    return (
      <AppScreen contentStyle={styles.emptyShell}>
        <MaterialIcons name="forum" size={42} color={palette.accent} />
        <Text style={[styles.emptyTitle, { color: palette.text }]}>Add a script to meet your audience</Text>
        <Text style={[styles.emptyBody, { color: palette.muted }]}>Audience reactions and questions are created on your device from your own script.</Text>
        <ActionButton label="Add your first script" icon="add" onPress={() => router.push("/script/new")} />
      </AppScreen>
    );
  }

  const toneColor = persona.tone === "supportive" ? palette.success : persona.tone === "skeptical" ? palette.warning : persona.tone === "direct" ? palette.primary : palette.accent;

  return (
    <AppScreen scroll>
      <View style={styles.headerRow}>
        <BrandLockup compact />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to training"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, { borderColor: palette.border, backgroundColor: palette.surface }, pressed && styles.pressed]}
        >
          <MaterialIcons name="close" size={20} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.heading}>
        <SectionHeading eyebrow="Offline pressure test" title="Audience simulation" />
        <Text style={[styles.intro, { color: palette.muted }]}>Step through four predictable audience perspectives. Practise a concise answer before checking your script-based response cue.</Text>
      </View>

      <Text style={[styles.label, { color: palette.muted }]}>SCRIPT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scriptRow}>
        {scripts.map((item) => {
          const selected = item.id === script.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => { setSelectedScriptId(item.id); setPersonaIndex(0); setShowResponseCue(false); }}
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

      <View style={styles.progressRow}>
        <Text style={[styles.progressLabel, { color: palette.accent }]}>PERSONA {personaIndex + 1} OF {PERSONAS.length}</Text>
        <Text style={[styles.progressLabel, { color: palette.muted }]}>SECTION {sectionIndex + 1} CUE</Text>
      </View>
      <ProgressBar progress={((personaIndex + 1) / PERSONAS.length) * 100} color={palette.accent} />

      <Card style={styles.personaCard}>
        <View style={styles.personaTop}>
          <View style={[styles.personaIcon, { backgroundColor: `${toneColor}1C` }]}>
            <MaterialIcons name={persona.icon} size={28} color={toneColor} />
          </View>
          <View style={styles.personaCopy}>
            <Text style={[styles.personaName, { color: palette.text }]}>{persona.name}</Text>
            <Text style={[styles.personaRole, { color: toneColor }]}>{persona.role.toUpperCase()}</Text>
          </View>
        </View>

        <View style={[styles.reactionBox, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
          <View style={styles.boxLabelRow}>
            <MaterialIcons name="record-voice-over" size={17} color={palette.accent} />
            <Text style={[styles.boxLabel, { color: palette.accent }]}>THEIR REACTION</Text>
          </View>
          <Text style={[styles.reactionText, { color: palette.text }]}>{persona.reaction(cue)}</Text>
        </View>

        <View style={styles.questionBlock}>
          <Text style={[styles.questionLabel, { color: palette.muted }]}>ANSWER ALOUD</Text>
          <Text style={[styles.questionText, { color: palette.text }]}>{persona.question(cue)}</Text>
        </View>

        {showResponseCue ? (
          <View style={[styles.responseCue, { borderColor: `${palette.primary}66`, backgroundColor: `${palette.primary}12` }]}>
            <View style={styles.boxLabelRow}>
              <MaterialIcons name="lightbulb-outline" size={17} color={palette.primary} />
              <Text style={[styles.boxLabel, { color: palette.primary }]}>RESPONSE CUE</Text>
            </View>
            <Text style={[styles.responseText, { color: palette.text }]}>{persona.responseCue(section)}</Text>
          </View>
        ) : (
          <ActionButton label="Reveal response cue" icon="visibility" kind="secondary" onPress={() => setShowResponseCue(true)} />
        )}
      </Card>

      <View style={styles.navigationRow}>
        <ActionButton compact label="Previous" icon="arrow-back" kind="ghost" disabled={personaIndex === 0} onPress={() => movePersona(personaIndex - 1)} />
        {personaIndex < PERSONAS.length - 1 ? (
          <ActionButton compact label="Next persona" icon="arrow-forward" kind="secondary" onPress={() => movePersona(personaIndex + 1)} />
        ) : (
          <ActionButton compact label="Back to training" icon="school" onPress={() => router.replace("/(tabs)/train")} />
        )}
      </View>

      <Card style={styles.rehearseCard}>
        <View style={styles.rehearseCopy}>
          <Text style={[styles.rehearseTitle, { color: palette.text }]}>Practise under pressure</Text>
          <Text style={[styles.rehearseBody, { color: palette.muted }]}>Deliver section {sectionIndex + 1} from memory, then recover with a cue only if needed.</Text>
        </View>
        <ActionButton
          compact
          label="Rehearse"
          icon="play-arrow"
          onPress={() => router.push({ pathname: "/rehearse", params: { scriptId: script.id, mode: "blind", sections: String(sectionIndex) } })}
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  emptyShell: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 14 },
  emptyTitle: { fontSize: 23, lineHeight: 29, fontWeight: "700", textAlign: "center" },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 6 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  closeButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heading: { marginTop: 24 },
  intro: { marginTop: -4, fontSize: 14, lineHeight: 21, maxWidth: 520 },
  label: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.6, marginTop: 22, marginBottom: 10 },
  scriptRow: { gap: 9, paddingBottom: 17 },
  scriptChip: { maxWidth: 220, height: 44, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 },
  scriptChipText: { flexShrink: 1, fontSize: 13, fontWeight: "700" },
  progressRow: { marginTop: 3, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", gap: 12 },
  progressLabel: { fontSize: 10, lineHeight: 14, letterSpacing: 1.05, fontWeight: "800" },
  personaCard: { marginTop: 16, gap: 18 },
  personaTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  personaIcon: { width: 56, height: 56, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  personaCopy: { flex: 1 },
  personaName: { fontSize: 20, lineHeight: 26, fontFamily: "serif", fontWeight: "700" },
  personaRole: { marginTop: 3, fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.15 },
  reactionBox: { borderWidth: 1, borderRadius: 16, padding: 15 },
  boxLabelRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  boxLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.2 },
  reactionText: { fontSize: 15, lineHeight: 23, fontStyle: "italic", fontWeight: "600" },
  questionBlock: { paddingHorizontal: 2 },
  questionLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.3, marginBottom: 7 },
  questionText: { fontSize: 19, lineHeight: 28, fontFamily: "serif", fontWeight: "700" },
  responseCue: { borderWidth: 1, borderRadius: 16, padding: 15 },
  responseText: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  navigationRow: { marginTop: 20, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rehearseCard: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 15, padding: 15 },
  rehearseCopy: { flex: 1 },
  rehearseTitle: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  rehearseBody: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton, AppScreen, BrandLockup, Card, ProgressBar, SectionHeading } from "@/components/app-ui";
import { useAppStore } from "@/lib/app-store";
import { splitSections } from "@/lib/rehearsal";

type PracticeQuestion = {
  prompt: string;
  answer: string;
  sectionIndex: number;
  label: string;
};

const RATING_OPTIONS = [
  { value: 1, label: "Again", icon: "replay" as const },
  { value: 2, label: "Hard", icon: "sentiment-dissatisfied" as const },
  { value: 3, label: "Good", icon: "sentiment-satisfied" as const },
  { value: 4, label: "Easy", icon: "sentiment-very-satisfied" as const },
];

function sentencesFrom(section: string) {
  return (section.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [section])
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function cueFrom(sentence: string) {
  const candidates = sentence.match(/[A-Za-z0-9'’-]{4,}/g) ?? [];
  return candidates.sort((left, right) => right.length - left.length)[0] ?? "this idea";
}

function buildQuestions(content: string): PracticeQuestion[] {
  return splitSections(content).flatMap((section, sectionIndex) => {
    const sentences = sentencesFrom(section);
    const opening = sentences[0] ?? section;
    const followUp = sentences[1];
    const questions: PracticeQuestion[] = [{
      prompt: `What is the main idea you need to communicate in section ${sectionIndex + 1}?`,
      answer: opening,
      sectionIndex,
      label: "Core message",
    }];

    if (followUp) {
      questions.push({
        prompt: `After “${cueFrom(opening)},” what point or action comes next?`,
        answer: followUp,
        sectionIndex,
        label: "Sequence cue",
      });
    }

    return questions;
  });
}

export default function PracticeQuestionsScreen() {
  const params = useLocalSearchParams<{ scriptId?: string }>();
  const { palette, scripts } = useAppStore();
  const [selectedScriptId, setSelectedScriptId] = useState(params.scriptId ?? "");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<number, number>>({});

  const script = scripts.find((item) => item.id === selectedScriptId) ?? scripts[0];
  const questions = useMemo(() => buildQuestions(script?.content ?? ""), [script?.content]);
  const question = questions[questionIndex];
  const currentRating = ratings[questionIndex];

  const chooseScript = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    setQuestionIndex(0);
    setRevealed(false);
    setRatings({});
  };

  const goToQuestion = (nextIndex: number) => {
    setQuestionIndex(Math.max(0, Math.min(questions.length - 1, nextIndex)));
    setRevealed(false);
  };

  if (!script || questions.length === 0 || !question) {
    return (
      <AppScreen contentStyle={styles.emptyShell}>
        <MaterialIcons name="quiz" size={42} color={palette.accent} />
        <Text style={[styles.emptyTitle, { color: palette.text }]}>Add a script to create questions</Text>
        <Text style={[styles.emptyBody, { color: palette.muted }]}>Practice questions are created on your device from each section of your script.</Text>
        <ActionButton label="Add your first script" icon="add" onPress={() => router.push("/script/new")} />
      </AppScreen>
    );
  }

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
        <SectionHeading eyebrow="Offline recall" title="Practice questions" />
        <Text style={[styles.intro, { color: palette.muted }]}>These prompts are generated deterministically from your script. Answer aloud before you reveal the cue.</Text>
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
              onPress={() => chooseScript(item.id)}
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
        <Text style={[styles.progressLabel, { color: palette.accent }]}>{question.label.toUpperCase()}</Text>
        <Text style={[styles.progressLabel, { color: palette.muted }]}>QUESTION {questionIndex + 1} OF {questions.length}</Text>
      </View>
      <ProgressBar progress={((questionIndex + 1) / questions.length) * 100} color={palette.accent} />

      <Card style={styles.questionCard}>
        <View style={[styles.questionIcon, { backgroundColor: `${palette.accent}18` }]}>
          <MaterialIcons name="help-outline" size={27} color={palette.accent} />
        </View>
        <Text style={[styles.questionText, { color: palette.text }]}>{question.prompt}</Text>
        <Text style={[styles.answerHint, { color: palette.muted }]}>Take a moment to answer in your own words.</Text>

        {revealed ? (
          <View style={[styles.answerBox, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
            <View style={styles.answerTitleRow}>
              <MaterialIcons name="lightbulb-outline" size={18} color={palette.primary} />
              <Text style={[styles.answerTitle, { color: palette.primary }]}>SCRIPT CUE</Text>
            </View>
            <Text style={[styles.answerText, { color: palette.text }]}>{question.answer}</Text>
          </View>
        ) : (
          <ActionButton label="Reveal script cue" icon="visibility" kind="secondary" onPress={() => setRevealed(true)} />
        )}
      </Card>

      <Text style={[styles.ratingLabel, { color: palette.muted }]}>HOW DID THAT FEEL?</Text>
      <View style={styles.ratingRow}>
        {RATING_OPTIONS.map((option) => {
          const selected = currentRating === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Rate this question ${option.label}`}
              onPress={() => setRatings((current) => ({ ...current, [questionIndex]: option.value }))}
              style={({ pressed }) => [
                styles.ratingButton,
                { borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? `${palette.primary}1A` : palette.surface },
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name={option.icon} size={20} color={selected ? palette.primary : palette.muted} />
              <Text style={[styles.ratingText, { color: selected ? palette.text : palette.muted }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.navigationRow}>
        <ActionButton compact label="Previous" icon="arrow-back" kind="ghost" disabled={questionIndex === 0} onPress={() => goToQuestion(questionIndex - 1)} />
        {questionIndex < questions.length - 1 ? (
          <ActionButton compact label="Next question" icon="arrow-forward" kind="secondary" onPress={() => goToQuestion(questionIndex + 1)} />
        ) : (
          <ActionButton compact label="Back to training" icon="school" onPress={() => router.replace("/(tabs)/train")} />
        )}
      </View>

      <Card style={styles.rehearseCard}>
        <View style={styles.rehearseCopy}>
          <Text style={[styles.rehearseTitle, { color: palette.text }]}>Ready to say it aloud?</Text>
          <Text style={[styles.rehearseBody, { color: palette.muted }]}>Rehearse section {question.sectionIndex + 1} with the full script visible.</Text>
        </View>
        <ActionButton
          compact
          label="Rehearse section"
          icon="play-arrow"
          onPress={() => router.push({ pathname: "/rehearse", params: { scriptId: script.id, mode: "full", sections: String(question.sectionIndex) } })}
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
  questionCard: { alignItems: "center", marginTop: 16, paddingVertical: 24 },
  questionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  questionText: { maxWidth: 560, fontSize: 23, lineHeight: 32, fontFamily: "serif", fontWeight: "700", textAlign: "center" },
  answerHint: { marginTop: 13, fontSize: 13, lineHeight: 20, textAlign: "center" },
  answerBox: { width: "100%", marginTop: 21, padding: 15, borderWidth: 1, borderRadius: 16 },
  answerTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  answerTitle: { fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 1.3 },
  answerText: { fontSize: 15, lineHeight: 23, fontWeight: "600" },
  ratingLabel: { marginTop: 22, marginBottom: 10, fontSize: 10, lineHeight: 14, letterSpacing: 1.5, fontWeight: "800" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingButton: { flex: 1, minHeight: 68, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 5 },
  ratingText: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  navigationRow: { marginTop: 20, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rehearseCard: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 15, padding: 15 },
  rehearseCopy: { flex: 1 },
  rehearseTitle: { fontSize: 14, lineHeight: 19, fontWeight: "800" },
  rehearseBody: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});

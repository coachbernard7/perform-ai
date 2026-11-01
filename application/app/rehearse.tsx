import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton, AppScreen, ProgressBar } from "@/components/app-ui";
import { PrivateContentGate } from "@/components/auth-gate";
import { API_BASE_URL } from "@/constants/oauth";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import type { PracticeSession, RehearsalMode, SectionResult } from "@/lib/app-types";
import { encodeRecordedAudio, persistRecordedAudio } from "@/lib/audio-upload";
import {
  MODE_LABELS,
  PROGRESSIVE_STAGES,
  buildSectionResults,
  compareTranscript,
  countWords,
  detectFillers,
  formatDuration,
  locateTranscriptPosition,
  parseSectionSelection,
  progressiveModeForLevel,
  secondsForPace,
  splitSections,
  tokenize,
  transformSection,
} from "@/lib/rehearsal";
import { trpc } from "@/lib/trpc";
import { createWebSpeechController, type WebSpeechController } from "@/lib/web-speech";
import { transcribeWebRecording } from "@/lib/php-transcription";
import { performEndpoint } from "@/lib/hosting";

const MODES: RehearsalMode[] = ["full", "first-letter", "keywords", "blind", "progressive", "presentation", "speaker-notes"];
const AUDIO_ON = { playsInSilentMode: true, interruptionMode: "doNotMix" as const, allowsRecording: true, shouldPlayInBackground: false, shouldRouteThroughEarpiece: false };
const AUDIO_OFF = { ...AUDIO_ON, allowsRecording: false };
const PACE_OPTIONS = [{ label: "Slow", wpm: 80 }, { label: "Steady", wpm: 110 }, { label: "Brisk", wpm: 140 }] as const;
const PLAYBACK_RATES = [0.75, 1, 1.25] as const;

type Entry = { text: string; label: string; originalIndex: number; notesMissing?: boolean };

export default function RehearseScreen() {
  const params = useLocalSearchParams<{ scriptId?: string; mode?: string; sections?: string; retryCount?: string }>();
  const { palette, scripts, settings, updateSettings, addSession } = useAppStore();
  const { ready, isAuthenticated, account, csrfToken } = usePerformAuth();
  const [phpTranscriptionConfigured, setPhpTranscriptionConfigured] = useState(false);
  const script = scripts.find((item) => item.id === params.scriptId) ?? scripts[0];
  const mode = (MODES.includes(params.mode as RehearsalMode) ? params.mode : "full") as RehearsalMode;
  const requested = useMemo(() => parseSectionSelection(params.sections), [params.sections]);
  const entries = useMemo<Entry[]>(() => {
    let list: Entry[];
    if ((mode === "presentation" || mode === "speaker-notes") && script?.slides?.length) {
      list = script.slides.map((slide, index) => ({
        text: mode === "speaker-notes" ? (slide.speakerNotes || slide.text) : slide.text,
        label: `Slide ${slide.number}${slide.title ? ` · ${slide.title}` : ""}`,
        originalIndex: index,
        notesMissing: mode === "speaker-notes" && !slide.speakerNotes.trim(),
      }));
    } else {
      list = splitSections(script?.content ?? "").map((text, index) => ({ text, label: `Section ${index + 1}`, originalIndex: index }));
    }
    return requested.size ? list.filter((item) => requested.has(item.originalIndex)) : list;
  }, [mode, requested, script]);
  const sections = useMemo(() => entries.map((item) => item.text), [entries]);
  const totalScriptWords = countWords(script?.content ?? "");
  const selectedWords = countWords(sections.join(" "));
  const selectedTargetSeconds = totalScriptWords && requested.size
    ? Math.max(1, Math.round((script?.targetSeconds ?? 0) * selectedWords / totalScriptWords))
    : script?.targetSeconds ?? 0;

  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [focus, setFocus] = useState(settings.focusMode);
  const [level, setLevel] = useState(0);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [retries] = useState<Record<number, number>>(() => {
    const retryCount = Number(params.retryCount ?? 0);
    return Number.isFinite(retryCount) && retryCount > 0 ? ({ 0: retryCount } as Record<number, number>) : {};
  });
  const [audioUri, setAudioUri] = useState<string>();
  const [targetWpm, setTargetWpm] = useState<number>(110);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [started, setStarted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [livePosition, setLivePosition] = useState({ sectionIndex: 0, wordIndex: -1, matchedWords: 0 });
  const [speechError, setSpeechError] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const speech = useRef<WebSpeechController | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(audioUri ?? null);
  const playerStatus = useAudioPlayerStatus(player);
  const analysis = trpc.rehearsal.transcribeAndAnalyze.useMutation();
  const speechSupported = Platform.OS === "web" && typeof window !== "undefined" && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const secureBrowserContext = Platform.OS !== "web" || typeof window === "undefined" || window.isSecureContext;
  const managedTranscriptionConfigured = Platform.OS === "web" ? phpTranscriptionConfigured : Boolean(API_BASE_URL);
  const recordingBlocker = Platform.OS === "web" && !secureBrowserContext
    ? "This local iPad address is not secure. The timer can run, but recording and scoring require an HTTPS address."
    : Platform.OS === "web" && !speechSupported && !managedTranscriptionConfigured
      ? "Live browser recognition is unavailable here and no secure transcription API is configured. Recording would not produce a transcript or score."
      : null;

  useEffect(() => {
    if (Platform.OS !== "web" || !account) return;
    let cancelled = false;
    void fetch(performEndpoint("transcribe.php"), {credentials:"include",cache:"no-store"})
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!cancelled) setPhpTranscriptionConfigured(Boolean(result?.configured)); })
      .catch(() => { if (!cancelled) setPhpTranscriptionConfigured(false); });
    return () => { cancelled = true; };
  }, [account]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void activateKeepAwakeAsync("spr").catch(() => undefined);
    return () => { void deactivateKeepAwake("spr").catch(() => undefined); };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const controller = createWebSpeechController((text) => {
      setTranscript(text);
      const position = locateTranscriptPosition(sections, text);
      setLivePosition(position);
    }, { onError: (error) => setSpeechError(error) });
    speech.current = controller;
    return () => controller.stop();
  }, [sections]);

  if (!script || !entries.length) {
    return <AppScreen contentStyle={styles.center}><Text style={[styles.title, { color: palette.text }]}>Script unavailable</Text><ActionButton label="Return to library" onPress={() => router.replace("/(tabs)/files")} /></AppScreen>;
  }

  const current = entries[index];
  const effective = mode === "progressive" ? progressiveModeForLevel(level) : mode;
  const currentPaceSeconds = secondsForPace(current.text, targetWpm);
  const selectedPaceSeconds = secondsForPace(sections.join(" "), targetWpm);
  const hidden = effective === "blind" && !revealed.has(current.originalIndex);
  const delivered = index < livePosition.sectionIndex
    ? countWords(current.text)
    : index === livePosition.sectionIndex ? Math.max(0, livePosition.wordIndex + 1) : 0;
  const progress = (index + 1) / entries.length * 100;
  const revealedLocal = new Set(entries.map((item, localIndex) => revealed.has(item.originalIndex) ? localIndex : -1).filter((value) => value >= 0));

  const mapSections = (results: SectionResult[]) => results.map((result, localIndex) => ({
    ...result,
    sectionIndex: entries[localIndex]?.originalIndex ?? result.sectionIndex,
    sectionLabel: entries[localIndex]?.label ?? result.sectionLabel,
  }));

  const start = async () => {
    if (recordingBlocker) {
      return Alert.alert("Recording analysis unavailable", recordingBlocker);
    }
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert("Microphone access needed", "Enable microphone access to record and analyse your rehearsal. The timer still works without it.");
      }
      await setAudioModeAsync(AUDIO_ON);
      await recorder.prepareToRecordAsync();
      recorder.record();
      speech.current?.start({ reset: true });
      setAudioUri(undefined);
      setTranscript("");
      setLivePosition({ sectionIndex: 0, wordIndex: -1, matchedWords: 0 });
      setSpeechError("");
      setStarted(true);
      setRunning(true);
      setElapsed(0);
    } catch {
      Alert.alert("Recording unavailable", "Check microphone permission and try again.");
    }
  };

  const pause = () => {
    if (!started || audioUri) {
      Alert.alert("Pause recording", "Start a recording before using pause or resume.");
      return;
    }
    if (running) {
      setRunning(false);
      speech.current?.stop();
      if (recorderState.isRecording) recorder.pause();
    } else {
      setRunning(true);
      if (started && !audioUri) recorder.record();
      if (started && !audioUri) speech.current?.start();
    }
  };

  const setPlaybackSpeed = (rate: number) => {
    player.setPlaybackRate(rate);
    setPlaybackRate(rate);
  };

  const togglePlayback = async () => {
    if (!audioUri) {
      Alert.alert("Playback unavailable", "Stop a recording first so there is a take to replay.");
      return;
    }
    try {
      await setAudioModeAsync(AUDIO_OFF);
      if (playerStatus.playing) {
        player.pause();
        return;
      }
      if (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration - 0.1) await player.seekTo(0);
      player.play();
    } catch {
      Alert.alert("Playback unavailable", "This recording could not be played on this device.");
    }
  };

  const stop = async () => {
    speech.current?.stop();
    setRunning(false);
    if (!started || audioUri) return audioUri;
    await recorder.stop();
    const temporaryUri = recorder.uri ?? undefined;
    setAudioUri(temporaryUri);
    await setAudioModeAsync(AUDIO_OFF);
    return temporaryUri;
  };

  const resetCapture = () => {
    speech.current?.reset();
    setRunning(false);
    setStarted(false);
    setAudioUri(undefined);
    setTranscript("");
    setLivePosition({ sectionIndex: 0, wordIndex: -1, matchedWords: 0 });
    setSpeechError("");
    setElapsed(0);
  };

  const retryCurrentSection = async () => {
    try {
      if (started && !audioUri) await stop();
    } catch {
      // The retry still opens even if the discarded take could not be finalized.
    }
    const retryCount = (retries[index] ?? 0) + 1;
    setIndex(0);
    resetCapture();
    router.replace({ pathname: "/rehearse", params: { scriptId: script.id, mode, sections: String(current.originalIndex), retryCount: String(retryCount) } });
  };

  const localAnalysis = (text: string) => {
    const comparison = compareTranscript(sections.join(" "), text);
    const fillers = detectFillers(text, settings.fillerWords);
    const expected = countWords(sections.join(" "));
    return {
      ...comparison,
      transcript: text,
      spokenWpm: elapsed ? Math.round(countWords(text) / (elapsed / 60)) : 0,
      completionPercent: expected ? Math.min(100, Math.round((comparison.correctWords + comparison.substitutions) / expected * 100)) : 0,
      fillers,
      fillerCount: fillers.reduce((sum, item) => sum + item.count, 0),
      sectionResults: mapSections(buildSectionResults(sections, comparison.alignments, retries, revealedLocal)),
    };
  };

  const finish = async () => {
    if (analysing) return;
    setRunning(false);
    speech.current?.stop();
    let uri = audioUri;
    try {
      if (started && !uri) uri = await stop();
      if (uri) {
        uri = await persistRecordedAudio(uri);
        setAudioUri(uri);
      }
      const spokenText = transcript.trim() || speech.current?.getTranscript().trim() || "";
      setAnalysing(Boolean(uri || spokenText));
      const completed = Math.min(sections.length, index + 1);
      const base: PracticeSession = {
        id: `session-${Date.now()}`,
        scriptId: script.id,
        scriptTitle: script.title,
        mode,
        durationSeconds: elapsed,
        targetSeconds: selectedPaceSeconds || selectedTargetSeconds,
        estimatedWpm: elapsed > 5 ? Math.round(countWords(sections.slice(0, completed).join(" ")) / (elapsed / 60)) : 0,
        completionPercent: Math.round(completed / sections.length * 100),
        confidence: 3,
        sectionsCompleted: completed,
        totalSections: sections.length,
        completedAt: new Date().toISOString(),
        audioUri: uri,
        analysisStatus: uri || spokenText ? "pending" : "not-recorded",
        sectionResults: mapSections(buildSectionResults(sections, [], retries, revealedLocal)),
      };
      let session = base;
      if (spokenText) {
        session = { ...base, ...localAnalysis(spokenText), analysisStatus: "complete" };
      } else if (uri && Platform.OS === "web") {
        if (!account || !csrfToken) throw new Error("Sign in before requesting recorded transcription.");
        const text = await transcribeWebRecording(uri, account.id, csrfToken);
        session = { ...base, ...localAnalysis(text), analysisStatus:"complete" };
      } else if (uri) {
        const encoded = await encodeRecordedAudio(uri);
        const result = await analysis.mutateAsync({
          ...encoded,
          expectedText: sections.join(" "),
          sections,
          fillerWords: settings.fillerWords,
          retries: Object.fromEntries(Object.entries(retries).map(([key, value]) => [String(key), value])),
          revealed: [...revealedLocal],
        });
        session = { ...base, ...result, sectionResults: mapSections(result.sectionResults), analysisStatus: "complete" };
      }
      addSession(session);
      router.replace({ pathname: "/results", params: { sessionId: session.id } });
    } catch (error) {
      const failed: PracticeSession = {
        id: `session-${Date.now()}`,
        scriptId: script.id,
        scriptTitle: script.title,
        mode,
        durationSeconds: elapsed,
        targetSeconds: selectedPaceSeconds || selectedTargetSeconds,
        estimatedWpm: 0,
        completionPercent: Math.round((index + 1) / sections.length * 100),
        confidence: 3,
        sectionsCompleted: index + 1,
        totalSections: sections.length,
        completedAt: new Date().toISOString(),
        audioUri: uri,
        analysisStatus: "failed",
        analysisError: error instanceof Error ? error.message : "Analysis failed.",
      };
      addSession(failed);
      Alert.alert("Analysis unavailable", `${failed.analysisError} Your take was still saved without a speech score.`);
      router.replace({ pathname: "/results", params: { sessionId: failed.id } });
    } finally {
      setAnalysing(false);
    }
  };

  const close = () => elapsed
    ? Alert.alert("Leave rehearsal?", "This attempt will not be saved.", [{ text: "Stay", style: "cancel" }, { text: "Leave", style: "destructive", onPress: () => router.back() }])
    : router.back();

  const scriptText = hidden ? (
    <View style={styles.blind}>
      <MaterialIcons name="visibility-off" size={38} color={palette.primary} />
      <Text style={[styles.title, { color: palette.text }]}>Trust your memory.</Text>
      <Text style={[styles.body, { color: palette.muted }]}>Deliver {current.label.toLowerCase()}, then reveal only if you need a cue.</Text>
    </View>
  ) : transcript && ["full", "presentation", "speaker-notes"].includes(effective) ? (
    <Text style={[styles.script, { color: palette.text }]}>
      {tokenize(current.text).map((word, wordIndex) => (
        <Text key={`${word}-${wordIndex}`} style={{ color: wordIndex < delivered ? palette.success : palette.text }}>{word} </Text>
      ))}
    </Text>
  ) : (
    <Text style={[styles.script, { color: palette.text }]}>{transformSection(current.text, mode, level)}</Text>
  );

  if (!ready || !isAuthenticated) return <AppScreen><PrivateContentGate title="Rehearsal is locked." body="Log in to reveal private script text, record a take, and calculate rehearsal feedback." /></AppScreen>;

  return (
    <AppScreen contentStyle={focus ? styles.focus : undefined}>
      <View style={styles.top}>
        <Pressable onPress={close} style={[styles.icon, { borderColor: palette.border }]}><MaterialIcons name="close" size={22} color={palette.text} /></Pressable>
        <View style={styles.topCopy}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text }]}>{script.title}</Text>
          <Text style={[styles.mode, { color: palette.accent }]}>{MODE_LABELS[mode].toUpperCase()}</Text>
        </View>
        <Pressable onPress={() => { setFocus(!focus); updateSettings({ focusMode: !focus }); }} style={[styles.icon, { borderColor: focus ? palette.primary : palette.border }]}><MaterialIcons name="center-focus-strong" size={21} color={focus ? palette.primary : palette.muted} /></Pressable>
      </View>

      <View style={styles.progress}>
        <Text style={[styles.label, { color: palette.muted }]}>{current.label.toUpperCase()} · {index + 1}/{sections.length}</Text>
        <Text style={[styles.timer, { color: running ? palette.primary : palette.text }]}>{formatDuration(elapsed)}</Text>
      </View>
      <ProgressBar progress={progress} color={palette.accent} />

      <View style={[styles.pacePanel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.paceHeading}><View><Text style={[styles.label, { color: palette.muted }]}>SCRIPT PACE</Text><Text style={[styles.paceValue, { color: palette.text }]}>{targetWpm} WPM · about {formatDuration(currentPaceSeconds)} for this section</Text></View><MaterialIcons name="speed" size={22} color={palette.accent} /></View>
        <View style={styles.paceOptions}>{PACE_OPTIONS.map((option) => { const selected = targetWpm === option.wpm; return <Pressable key={option.wpm} accessibilityRole="button" accessibilityLabel={`${option.label} pace, ${option.wpm} words per minute${selected ? ", selected" : ""}`} onPress={() => setTargetWpm(option.wpm)} style={({ pressed }) => [styles.paceOption, { borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? `${palette.primary}18` : palette.surfaceAlt }, pressed && styles.pressed]}><Text style={[styles.paceOptionLabel, { color: selected ? palette.primary : palette.text }]}>{option.label}</Text><Text style={[styles.paceOptionValue, { color: palette.muted }]}>{option.wpm} WPM</Text></Pressable>; })}</View>
        <Text style={[styles.paceNote, { color: palette.muted }]}>You choose when to move to the next section. Pace only sets your time guide; it never advances the script automatically.</Text>
      </View>

      {mode === "progressive" ? (
        <View>
          <Text style={[styles.stageLabel, { color: palette.muted }]}>STAGE {level + 1} OF {PROGRESSIVE_STAGES.length} · {PROGRESSIVE_STAGES[level].description.toUpperCase()}</Text>
          <View style={styles.levels}>{PROGRESSIVE_STAGES.map((stage, stageIndex) => (
            <Pressable key={stage.description} onPress={() => setLevel(stageIndex)} style={[styles.chip, { borderColor: stageIndex === level ? palette.primary : palette.border, backgroundColor: stageIndex === level ? `${palette.primary}18` : palette.surface }]}>
              <Text style={{ fontSize: 9, fontWeight: "800", color: stageIndex === level ? palette.primary : palette.muted }}>{stage.label}</Text>
            </Pressable>
          ))}</View>
        </View>
      ) : null}

      {current.notesMissing ? <Text style={[styles.notesWarning, { color: palette.warning }]}>This slide has no speaker notes; visible slide text is shown instead.</Text> : null}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {scriptText}
        {recordingBlocker ? <View style={[styles.supportNotice, { backgroundColor: `${palette.warning}18`, borderColor: `${palette.warning}66` }]}><MaterialIcons name="info-outline" size={18} color={palette.warning} /><Text style={[styles.supportNoticeText, { color: palette.text }]}>{recordingBlocker}</Text></View> : null}
        {transcript ? (
          <View style={[styles.transcript, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.label, { color: palette.accent }]}>LIVE TRANSCRIPT · ALIGNED FOLLOWING</Text>
            <Text style={[styles.body, { color: palette.muted }]}>{transcript}</Text>
            <Text style={[styles.matchNote, { color: palette.success }]}>{livePosition.matchedWords} script words matched</Text>
          </View>
        ) : null}
        {started && Platform.OS === "web" && !speechSupported && managedTranscriptionConfigured ? <Text style={[styles.supportNote, { color: palette.warning }]}>Live following is unavailable in this browser. Your recorded take will be sent to the configured transcription service when you select Finish.</Text> : null}
        {speechError ? <Text style={[styles.supportNote, { color: palette.warning }]}>Live recognition reported: {speechError}. Recording continues.</Text> : null}
      </ScrollView>

      <View style={[styles.controls, { borderTopColor: palette.border }]}>
        {analysing ? (
          <View style={styles.loading}><ActivityIndicator color={palette.primary} /><Text style={[styles.body, { color: palette.text }]}>Transcribing, comparing, and scoring…</Text></View>
        ) : (
          <>
            <View style={styles.row}>
              <ActionButton compact label="Retry this section" icon="replay" kind="ghost" onPress={() => { void retryCurrentSection(); }} />
              <ActionButton compact label={running ? "Pause recording" : "Resume recording"} icon={running ? "pause" : "play-arrow"} kind="secondary" disabled={!started || Boolean(audioUri)} onPress={pause} />
              {effective === "blind" || mode === "progressive" ? <ActionButton compact label={revealed.has(current.originalIndex) ? "Hide cue" : "Reveal cue"} icon="visibility" kind="ghost" onPress={() => setRevealed((existing) => { const next = new Set(existing); if (next.has(current.originalIndex)) next.delete(current.originalIndex); else next.add(current.originalIndex); return next; })} /> : null}
            </View>
            <View style={styles.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={recorderState.isRecording ? "Stop and review take" : audioUri ? "Recording ready — review or analyse" : "Record and analyse"} disabled={Boolean(audioUri)} onPress={recorderState.isRecording ? () => { void stop(); } : start} style={[styles.record, { borderColor: recorderState.isRecording ? palette.danger : palette.border, backgroundColor: palette.surfaceAlt }, audioUri && styles.disabled]}>
                <MaterialIcons name={recorderState.isRecording ? "stop" : audioUri ? "check-circle" : "mic"} size={22} color={recorderState.isRecording ? palette.danger : palette.accent} />
                <Text style={[styles.recordText, { color: palette.text }]}>{recorderState.isRecording ? "Stop & review take" : audioUri ? "Recording ready — review or analyse" : "Record & analyse"}</Text>
              </Pressable>
            </View>
            {audioUri ? <View style={[styles.playbackCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}><View style={styles.playbackHeader}><View><Text style={[styles.label, { color: palette.muted }]}>REPLAY YOUR TAKE</Text><Text style={[styles.playbackStatus, { color: palette.text }]}>{playerStatus.playing ? "Playing your recording" : `Ready to review · ${formatDuration(Math.round(playerStatus.duration || elapsed))}`}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={playerStatus.playing ? "Pause playback" : "Play recording"} onPress={() => { void togglePlayback(); }} style={[styles.play, { backgroundColor: palette.primary }]}><MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={25} color="#050811" /></Pressable></View><View style={styles.rateRow}>{PLAYBACK_RATES.map((rate) => <Pressable key={rate} accessibilityRole="button" accessibilityLabel={`Play at ${rate} times speed${playbackRate === rate ? ", selected" : ""}`} onPress={() => setPlaybackSpeed(rate)} style={({ pressed }) => [styles.rateButton, { borderColor: playbackRate === rate ? palette.primary : palette.border, backgroundColor: playbackRate === rate ? `${palette.primary}18` : palette.surface }, pressed && styles.pressed]}><Text style={[styles.rateText, { color: playbackRate === rate ? palette.primary : palette.text }]}>{rate}×</Text></Pressable>)}</View></View> : null}
            <View style={styles.row}>
              <ActionButton compact label="Previous" icon="arrow-back" kind="ghost" disabled={!index} onPress={() => setIndex((value) => Math.max(0, value - 1))} />
              {index < sections.length - 1
                ? <ActionButton compact label="Next section" icon="arrow-forward" kind="secondary" onPress={() => setIndex((value) => Math.min(sections.length - 1, value + 1))} />
                : <ActionButton compact label={audioUri ? "Analyse recording" : "Finish"} icon="check" onPress={finish} />}
            </View>
          </>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", gap: 16 },
  title: { fontSize: 25, lineHeight: 32, fontFamily: "serif", fontWeight: "700", textAlign: "center" },
  body: { fontSize: 12, lineHeight: 19, textAlign: "center" },
  focus: { paddingHorizontal: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  topCopy: { flex: 1, alignItems: "center" },
  name: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  mode: { fontSize: 9, lineHeight: 13, fontWeight: "800", letterSpacing: 1.3 },
  progress: { marginTop: 20, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 9, lineHeight: 13, fontWeight: "800", letterSpacing: 1.1 },
  timer: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  pacePanel: { marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  paceHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  paceValue: { fontSize: 12, lineHeight: 18, fontWeight: "800", marginTop: 2 },
  paceOptions: { flexDirection: "row", gap: 7 },
  paceOption: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: "center", paddingVertical: 8 },
  paceOptionLabel: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  paceOptionValue: { fontSize: 9, lineHeight: 13, marginTop: 1 },
  paceNote: { fontSize: 10, lineHeight: 15 },
  stageLabel: { fontSize: 9, lineHeight: 13, fontWeight: "800", letterSpacing: 1, marginTop: 10 },
  levels: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },
  chip: { width: "31.5%", borderWidth: 1, borderRadius: 11, paddingVertical: 8, alignItems: "center" },
  notesWarning: { fontSize: 10, lineHeight: 15, fontWeight: "700", textAlign: "center", marginTop: 9 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingVertical: 22, paddingHorizontal: 8 },
  script: { fontSize: 27, lineHeight: 42, textAlign: "center", fontFamily: "serif", fontWeight: "500" },
  blind: { alignItems: "center", gap: 12, paddingHorizontal: 22 },
  transcript: { borderWidth: 1, borderRadius: 16, padding: 13, marginTop: 20 },
  supportNotice: { marginTop: 20, borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  supportNoticeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  matchNote: { fontSize: 10, lineHeight: 15, fontWeight: "800", textAlign: "center", marginTop: 7 },
  supportNote: { fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 12 },
  controls: { borderTopWidth: 1, paddingTop: 11, paddingBottom: 12, gap: 9 },
  row: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9 },
  record: { height: 52, flex: 1, borderWidth: 1, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  playbackCard: { borderWidth: 1, borderRadius: 16, padding: 11, gap: 9 },
  playbackHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  playbackStatus: { fontSize: 12, lineHeight: 18, fontWeight: "800", marginTop: 2 },
  rateRow: { flexDirection: "row", gap: 7 },
  rateButton: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 7, alignItems: "center" },
  rateText: { fontSize: 11, fontWeight: "800" },
  disabled: { opacity: 0.6 },
  recordText: { fontSize: 12, fontWeight: "800" },
  play: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  loading: { minHeight: 115, alignItems: "center", justifyContent: "center", gap: 12 },
  pressed: { opacity: 0.75 },
});

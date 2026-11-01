import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen, BrandLockup, Card, EmptyState, Metric, ProgressBar, SectionHeading } from "@/components/app-ui";
import { PrivateContentGate } from "@/components/auth-gate";
import { useAppStore } from "@/lib/app-store";
import { usePerformAuth } from "@/lib/perform-auth";
import { MODE_LABELS, formatDuration, formatMinutes, getPreviousAnalysedSession } from "@/lib/rehearsal";

export default function ScoresScreen() {
  const { palette, sessions } = useAppStore();
  const { ready, isAuthenticated } = usePerformAuth();
  if (!ready || !isAuthenticated) {
    return <AppScreen><BrandLockup compact /><PrivateContentGate title="Practice history is private." body="Log in to see your recorded rehearsal results, accuracy, pace, and improvement." /></AppScreen>;
  }
  const total = sessions.reduce((sum, item) => sum + item.durationSeconds, 0);
  const analysed = sessions.filter((item) => item.accuracyPercent !== undefined);
  const best = analysed.reduce((score, item) => Math.max(score, item.accuracyPercent ?? 0), 0);
  const paced = analysed.filter((item) => (item.spokenWpm ?? 0) > 0);
  const averagePace = paced.length ? Math.round(paced.reduce((sum, item) => sum + (item.spokenWpm ?? 0), 0) / paced.length) : 0;

  return (
    <AppScreen>
      <View style={styles.header}>
        <BrandLockup compact />
        <SectionHeading eyebrow="Performance" title="Practice history" />
        <Card>
          <View style={styles.metrics}>
            <Metric label="Best accuracy" value={analysed.length ? `${best}%` : "—"} accent={palette.success} />
            <Metric label="Avg spoken WPM" value={averagePace ? `${averagePace}` : "—"} accent={palette.accent} />
            <Metric label="Total time" value={formatMinutes(total)} />
          </View>
        </Card>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="insights" title="Your progress starts here" body="Complete a rehearsal and your timing, pace, completion, and confidence will appear here." />}
        renderItem={({ item }) => {
          const previous = getPreviousAnalysedSession(sessions, item);
          const change = item.accuracyPercent !== undefined && previous?.accuracyPercent !== undefined ? item.accuracyPercent - previous.accuracyPercent : undefined;
          return (
          <Pressable onPress={() => router.push({ pathname: "/results", params: { sessionId: item.id } })} style={({ pressed }) => pressed && styles.pressed}><Card style={styles.sessionCard}>
            <View style={styles.row}>
              <View style={[styles.scoreBadge, { backgroundColor: `${palette.success}18` }]}>
                <Text style={[styles.score, { color: item.accuracyPercent !== undefined ? palette.success : palette.muted }]}>{item.accuracyPercent ?? "—"}</Text>
                <Text style={[styles.percent, { color: palette.success }]}>{item.accuracyPercent !== undefined ? "%" : ""}</Text>
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={[styles.title, { color: palette.text }]}>{item.scriptTitle}</Text>
                <Text style={[styles.meta, { color: palette.muted }]}>{MODE_LABELS[item.mode]} · {new Date(item.completedAt).toLocaleDateString()}</Text>
              </View>
              <MaterialIcons name={item.audioUri ? "graphic-eq" : "check-circle"} size={21} color={item.audioUri ? palette.accent : palette.primary} />
            </View>
            <ProgressBar progress={item.accuracyPercent ?? 0} color={item.accuracyPercent !== undefined ? palette.success : palette.muted} />
            <View style={styles.detailRow}>
              <Text style={[styles.detail, { color: palette.muted }]}>{item.completionPercent}% completion</Text>
              <Text style={[styles.detail, { color: palette.muted }]}>{item.spokenWpm || "—"} spoken WPM</Text>
              <Text style={[styles.detail, { color: palette.muted }]}>{formatDuration(item.durationSeconds)}</Text>
            </View>
            {change !== undefined ? <Text style={[styles.change, { color: change >= 0 ? palette.success : palette.warning }]}>{change >= 0 ? "+" : ""}{change} accuracy points from the previous analysed take</Text> : null}
          </Card></Pressable>
          );
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 24 },
  metrics: { flexDirection: "row", gap: 12 },
  list: { paddingTop: 18, paddingBottom: 120, gap: 12 },
  sessionCard: { gap: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreBadge: { width: 54, height: 54, borderRadius: 18, flexDirection: "row", alignItems: "baseline", justifyContent: "center", paddingTop: 12 },
  score: { fontSize: 21, fontWeight: "900" },
  percent: { fontSize: 10, fontWeight: "800" },
  copy: { flex: 1 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  meta: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  detail: { fontSize: 10, lineHeight: 15 },
  change: { fontSize: 10, lineHeight: 15, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});

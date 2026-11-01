import { buildSectionResults, calculatePauseMetrics, compareTranscript, countWords, detectFillers } from "../../lib/rehearsal";
import type { TranscriptResult } from "./transcription-provider";

export type RehearsalAnalysisInput = {
  expectedText: string;
  sections: string[];
  fillerWords: string[];
  retries?: Record<number, number>;
  revealed?: ReadonlySet<number>;
};

export function analyseTranscript(input: RehearsalAnalysisInput, transcript: TranscriptResult) {
  const comparison = compareTranscript(input.expectedText, transcript.text);
  const fillers = detectFillers(transcript.text, input.fillerWords);
  const pauses = calculatePauseMetrics(transcript.segments);
  const sectionResults = buildSectionResults(input.sections, comparison.alignments, input.retries ?? {}, input.revealed ?? new Set());
  const covered = comparison.correctWords + comparison.substitutions;
  const expected = countWords(input.expectedText);
  const duration = transcript.duration > 0 ? transcript.duration : Math.max(1, transcript.segments.at(-1)?.end ?? 1);
  return {
    ...comparison,
    transcript: transcript.text,
    language: transcript.language,
    transcriptDurationSeconds: duration,
    spokenWpm: Math.round(countWords(transcript.text) / (duration / 60)),
    completionPercent: expected ? Math.min(100, Math.round(covered / expected * 100)) : 0,
    fillers,
    fillerCount: fillers.reduce((sum, item) => sum + item.count, 0),
    ...pauses,
    sectionResults,
  };
}

import type {
  AnalysisStatus,
  FillerOccurrence,
  PracticeSession,
  RehearsalMode,
  SectionResult,
  WordAlignment,
} from "./app-types";

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "before", "being", "between", "could", "every",
  "first", "from", "have", "into", "just", "more", "most", "other", "over", "should", "some",
  "such", "than", "that", "their", "there", "these", "they", "this", "through", "under", "very",
  "what", "when", "where", "which", "while", "with", "would", "your",
]);

export const DEFAULT_FILLER_WORDS = ["um", "uh", "erm", "like", "you know", "sort of", "kind of"];

export const MODE_LABELS: Record<RehearsalMode, string> = {
  full: "Full text",
  "first-letter": "First letters",
  keywords: "Keywords",
  blind: "Blind",
  progressive: "Progressive memory",
  presentation: "Presentation / slides",
  "speaker-notes": "Speaker notes",
};

export const MODE_DESCRIPTIONS: Record<RehearsalMode, string> = {
  full: "Read the complete section while you build flow and pace.",
  "first-letter": "Use the first letter of each word as a memory scaffold.",
  keywords: "See only the strongest cue words from each sentence.",
  blind: "Hide the script and deliver the section entirely from memory.",
  progressive: "Move through six stages from full text to blind delivery.",
  presentation: "Rehearse one imported slide at a time using its visible slide text.",
  "speaker-notes": "Use the speaker notes attached to each imported presentation slide.",
};

export const PROGRESSIVE_STAGES = [
  { label: "100%", description: "100% Text", mode: "full" as RehearsalMode, visibleFraction: 1 },
  { label: "75%", description: "75% Text", mode: "full" as RehearsalMode, visibleFraction: 0.75 },
  { label: "50%", description: "50% Text", mode: "full" as RehearsalMode, visibleFraction: 0.5 },
  { label: "Keys", description: "Keywords", mode: "keywords" as RehearsalMode, visibleFraction: 0 },
  { label: "Letters", description: "First Letters", mode: "first-letter" as RehearsalMode, visibleFraction: 0 },
  { label: "Blind", description: "Blind", mode: "blind" as RehearsalMode, visibleFraction: 0 },
] as const;

export function splitSections(content: string) {
  const blocks = content.split(/\n\s*\n/g).map((section) => section.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (blocks.length) return blocks;
  const fallback = content.replace(/\s+/g, " ").trim();
  return fallback ? [fallback] : [];
}

export function tokenize(content: string) {
  return content.match(/[\p{L}\p{N}'’-]+/gu) ?? [];
}

export function countWords(content: string) {
  return tokenize(content).length;
}

/**
 * Converts a spoken pace target into a whole-second guide for the visible
 * section. It is a cue only: section changes remain under the user's control.
 */
export function secondsForPace(content: string, wordsPerMinute: number) {
  const safePace = Math.max(40, Math.min(220, Math.round(wordsPerMinute) || 100));
  const words = countWords(content);
  return words ? Math.max(1, Math.round(words / safePace * 60)) : 0;
}

export function parseSectionSelection(value?: string | string[]) {
  const source = Array.isArray(value) ? value.join(",") : value ?? "";
  return new Set(source.split(",").map((part) => part.trim()).filter(Boolean).map(Number).filter((index) => Number.isInteger(index) && index >= 0));
}

export function normalizeToken(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’]/g, "'").toLocaleLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
}

function firstLetters(content: string) {
  return content.split(/(\s+)/).map((token) => {
    if (/^\s+$/.test(token)) return token;
    const clean = token.replace(/[^\p{L}\p{N}'’]/gu, "");
    return clean ? `${clean.charAt(0).toUpperCase()}${/[.!?]$/.test(token) ? token.slice(-1) : ""}` : token;
  }).join("");
}

function keywords(content: string) {
  const words = tokenize(content);
  const selected = words.filter((word) => {
    const normalized = normalizeToken(word);
    return (normalized.length >= 5 && !STOP_WORDS.has(normalized)) || /\d/.test(word);
  }).slice(0, 18);
  return selected.length ? selected.join("  ·  ") : words.filter((_, index) => index % 3 === 0).join("  ·  ");
}

function partiallyMask(content: string, visibleFraction: number) {
  let wordIndex = 0;
  return content.split(/(\s+)/).map((token) => {
    if (/^\s+$/.test(token)) return token;
    const shouldHide = visibleFraction === 0.75 ? wordIndex % 4 === 3 : wordIndex % 2 === 1;
    wordIndex += 1;
    return shouldHide ? token.replace(/[\p{L}\p{N}]/gu, "•") : token;
  }).join("");
}

export function progressiveModeForLevel(level: number): RehearsalMode {
  const index = Math.max(0, Math.min(PROGRESSIVE_STAGES.length - 1, Math.round(level)));
  return PROGRESSIVE_STAGES[index]?.mode ?? "full";
}

export function transformSection(content: string, mode: RehearsalMode, progressiveLevel = 0) {
  if (mode === "progressive") {
    const stage = PROGRESSIVE_STAGES[Math.max(0, Math.min(PROGRESSIVE_STAGES.length - 1, Math.round(progressiveLevel)))] ?? PROGRESSIVE_STAGES[0];
    if (stage.visibleFraction === 0.75 || stage.visibleFraction === 0.5) return partiallyMask(content, stage.visibleFraction);
    return transformSection(content, stage.mode);
  }
  switch (mode) {
    case "first-letter": return firstLetters(content);
    case "keywords": return keywords(content);
    case "blind": return "Look up. Breathe. Deliver this section from memory.";
    default: return content;
  }
}

export function compareTranscript(expectedText: string, spokenText: string) {
  const expected = tokenize(expectedText);
  const spoken = tokenize(spokenText);
  const normalizedExpected = expected.map(normalizeToken);
  const normalizedSpoken = spoken.map(normalizeToken);
  const rows = expected.length + 1;
  const cols = spoken.length + 1;
  if (expected.length > 3000 || spoken.length > 3000 || rows * cols > 6_500_000) {
    throw new Error("This transcript is too long to compare safely on this device.");
  }

  const directions = new Uint8Array(rows * cols);
  let previous = new Uint16Array(cols);
  let current = new Uint16Array(cols);
  for (let column = 1; column < cols; column += 1) {
    previous[column] = column;
    directions[column] = 3;
  }
  for (let row = 1; row < rows; row += 1) {
    current[0] = row;
    directions[row * cols] = 2;
    for (let column = 1; column < cols; column += 1) {
      const substitution = previous[column - 1] + (normalizedExpected[row - 1] === normalizedSpoken[column - 1] ? 0 : 1);
      const missing = previous[column] + 1;
      const additional = current[column - 1] + 1;
      if (substitution <= missing && substitution <= additional) {
        current[column] = substitution;
        directions[row * cols + column] = 1;
      } else if (missing <= additional) {
        current[column] = missing;
        directions[row * cols + column] = 2;
      } else {
        current[column] = additional;
        directions[row * cols + column] = 3;
      }
    }
    [previous, current] = [current, previous];
  }

  const alignments: WordAlignment[] = [];
  let row = expected.length;
  let column = spoken.length;
  while (row > 0 || column > 0) {
    const direction = directions[row * cols + column];
    if (row > 0 && column > 0 && direction === 1) {
      const correct = normalizedExpected[row - 1] === normalizedSpoken[column - 1];
      alignments.push({ expected: expected[row - 1], spoken: spoken[column - 1], status: correct ? "correct" : "substitution", expectedIndex: row - 1, spokenIndex: column - 1 });
      row -= 1;
      column -= 1;
    } else if (row > 0 && (direction === 2 || column === 0)) {
      alignments.push({ expected: expected[row - 1], status: "missing", expectedIndex: row - 1 });
      row -= 1;
    } else {
      alignments.push({ spoken: spoken[column - 1], status: "additional", spokenIndex: column - 1 });
      column -= 1;
    }
  }
  alignments.reverse();
  const correctWords = alignments.filter((item) => item.status === "correct").length;
  const missingWords = alignments.filter((item) => item.status === "missing").length;
  const additionalWords = alignments.filter((item) => item.status === "additional").length;
  const substitutions = alignments.filter((item) => item.status === "substitution").length;
  return {
    alignments,
    correctWords,
    missingWords,
    additionalWords,
    substitutions,
    accuracyPercent: expected.length ? Math.round(correctWords / expected.length * 100) : 0,
  };
}

export function locateTranscriptPosition(sections: string[], transcript: string) {
  if (!transcript.trim() || !sections.length) return { sectionIndex: 0, wordIndex: -1, matchedWords: 0 };
  const expected = tokenize(sections.join(" ")).map(normalizeToken);
  const spoken = tokenize(transcript).map(normalizeToken);
  let expectedCursor = 0;
  let globalWordIndex = -1;
  let matchedWords = 0;
  for (const spokenWord of spoken) {
    const match = expected.indexOf(spokenWord, expectedCursor);
    if (match === -1) continue;
    globalWordIndex = match;
    expectedCursor = match + 1;
    matchedWords += 1;
  }
  if (globalWordIndex < 0) return { sectionIndex: 0, wordIndex: -1, matchedWords: 0 };
  let offset = 0;
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const length = countWords(sections[sectionIndex]);
    if (globalWordIndex < offset + length) {
      return { sectionIndex, wordIndex: globalWordIndex - offset, matchedWords };
    }
    offset += length;
  }
  const finalIndex = sections.length - 1;
  return { sectionIndex: finalIndex, wordIndex: Math.max(0, countWords(sections[finalIndex]) - 1), matchedWords };
}

export function detectFillers(transcript: string, fillerWords: string[]): FillerOccurrence[] {
  const text = tokenize(transcript).map(normalizeToken).join(" ");
  return fillerWords.map((phrase) => {
    const normalized = tokenize(phrase).map(normalizeToken).join(" ");
    if (!normalized) return { phrase, count: 0 };
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { phrase, count: (text.match(new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, "g")) ?? []).length };
  }).filter((item) => item.count > 0);
}

export function calculatePauseMetrics(segments: Array<{ start: number; end: number }>, thresholdSeconds = 0.8) {
  let pauseCount = 0;
  let hesitationSeconds = 0;
  let longestPauseSeconds = 0;
  for (let index = 1; index < segments.length; index += 1) {
    const gap = Math.max(0, segments[index].start - segments[index - 1].end);
    if (gap >= thresholdSeconds) {
      pauseCount += 1;
      hesitationSeconds += gap;
      longestPauseSeconds = Math.max(longestPauseSeconds, gap);
    }
  }
  return { pauseCount, hesitationSeconds: Number(hesitationSeconds.toFixed(1)), longestPauseSeconds: Number(longestPauseSeconds.toFixed(1)) };
}

export function buildSectionResults(
  sections: string[],
  alignments: WordAlignment[],
  retries: Record<number, number> = {},
  revealed: ReadonlySet<number> = new Set(),
): SectionResult[] {
  let offset = 0;
  return sections.map((section, index) => {
    const words = countWords(section);
    const end = offset + words;
    const relevant = alignments.filter((item) => item.expectedIndex !== undefined && item.expectedIndex >= offset && item.expectedIndex < end);
    const correct = relevant.filter((item) => item.status === "correct").length;
    const accuracyPercent = relevant.length && words ? Math.round(correct / words * 100) : undefined;
    const retry = retries[index] ?? 0;
    const wasRevealed = revealed.has(index);
    offset = end;
    return {
      sectionIndex: index,
      sectionLabel: `Section ${index + 1}`,
      accuracyPercent,
      retries: retry,
      revealed: wasRevealed,
      weak: (accuracyPercent ?? 100) < 85 || retry > 0 || wasRevealed,
    };
  });
}

export function getWeakSectionIndexes(sessions: PracticeSession[], scriptId: string) {
  const scores = new Map<number, { weak: number; total: number; accuracy: number; measured: number }>();
  sessions.filter((session) => session.scriptId === scriptId).slice(0, 8).forEach((session) => session.sectionResults?.forEach((section) => {
    const value = scores.get(section.sectionIndex) ?? { weak: 0, total: 0, accuracy: 0, measured: 0 };
    value.total += 1;
    if (section.weak) value.weak += 1;
    if (section.accuracyPercent !== undefined) {
      value.accuracy += section.accuracyPercent;
      value.measured += 1;
    }
    scores.set(section.sectionIndex, value);
  }));
  return [...scores.entries()]
    .filter(([, value]) => value.weak > 0 || (value.measured > 0 && value.accuracy / value.measured < 85))
    .sort((left, right) => right[1].weak / right[1].total - left[1].weak / left[1].total)
    .map(([index]) => index);
}

export function getQuickTrainSectionIndexes(sections: string[], sessions: PracticeSession[], scriptId: string) {
  const selected = new Set<number>(getWeakSectionIndexes(sessions, scriptId));
  if (sections.length) selected.add(0);
  if (sections.length > 1) selected.add(sections.length - 1);
  sections.forEach((section, index) => {
    if (/\b\d[\d,.%]*\b|\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(section)) selected.add(index);
    if (/\b(?:however|therefore|finally|first|next|because|remember|important)\b/i.test(section)) selected.add(index);
  });
  return [...selected].slice(0, 6).sort((left, right) => left - right);
}

export function getPreviousAnalysedSession(sessions: PracticeSession[], current: PracticeSession) {
  return sessions
    .filter((item) => item.id !== current.id && item.scriptId === current.scriptId && item.analysisStatus === "complete" && item.accuracyPercent !== undefined)
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())
    .find((item) => new Date(item.completedAt).getTime() < new Date(current.completedAt).getTime());
}

export function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatMinutes(totalSeconds: number) {
  if (!totalSeconds) return "0 min";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes} min`;
}

export function getCoachMessage(input: {
  analysisStatus?: AnalysisStatus;
  completionPercent: number;
  estimatedWpm: number;
  spokenWpm?: number;
  accuracyPercent?: number;
  fillerCount?: number;
  missingWords?: number;
  durationSeconds: number;
  targetSeconds: number;
  sectionResults?: SectionResult[];
  previousAccuracy?: number;
}) {
  if (input.analysisStatus !== "complete" || input.accuracyPercent === undefined) {
    return "No speech score was created for this take. Record and analyse a rehearsal to receive evidence-based coaching.";
  }
  const measuredSections = (input.sectionResults ?? []).filter((section) => section.accuracyPercent !== undefined);
  const weakest = [...measuredSections].sort((left, right) => (left.accuracyPercent ?? 100) - (right.accuracyPercent ?? 100))[0];
  const strongest = [...measuredSections].sort((left, right) => (right.accuracyPercent ?? 0) - (left.accuracyPercent ?? 0))[0];
  if (input.previousAccuracy !== undefined && input.accuracyPercent - input.previousAccuracy >= 3) {
    return `Your accuracy improved from ${input.previousAccuracy}% to ${input.accuracyPercent}%. ${weakest ? `${weakest.sectionLabel} is still the best place for your next focused retry.` : "Repeat the full presentation to make that gain consistent."}`;
  }
  if (weakest && (weakest.accuracyPercent ?? 100) < 85) {
    return `${weakest.sectionLabel} was your weakest at ${weakest.accuracyPercent}%. You missed ${input.missingWords ?? 0} words overall; rehearse that section slowly, then record a fresh retry.`;
  }
  if ((input.missingWords ?? 0) > 4) {
    return `${input.missingWords} expected words were missed. Review the transitions around those omissions and repeat the affected sections.`;
  }
  if ((input.fillerCount ?? 0) > 3) {
    return `${input.fillerCount} filler words were detected. Replace the most common filler with a deliberate silent pause.`;
  }
  const pace = input.spokenWpm ?? input.estimatedWpm;
  if (pace > 170) return `You averaged ${pace} WPM. Slow down around key ideas and add one deliberate pause per section.`;
  if (pace > 0 && pace < 105) return `You averaged ${pace} WPM. Keep the clarity, then connect phrases more confidently.`;
  const delta = input.durationSeconds - input.targetSeconds;
  if (input.targetSeconds > 0 && Math.abs(delta) > 20) {
    return delta > 0
      ? `You ran ${formatDuration(delta)} over target. Tighten transitions first; they usually offer the cleanest time saving.`
      : `You finished ${formatDuration(Math.abs(delta))} under target. Give important ideas more space and let pauses work for you.`;
  }
  return strongest
    ? `${strongest.sectionLabel} was your strongest at ${strongest.accuracyPercent}%. Repeat the full presentation and protect that same clarity in every section.`
    : `Your measured accuracy was ${input.accuracyPercent}% at ${pace || 0} WPM. Repeat the presentation to build a comparison trend.`;
}

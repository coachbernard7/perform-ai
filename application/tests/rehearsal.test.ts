import { describe, expect, it } from "vitest";

import {
  PROGRESSIVE_STAGES,
  buildSectionResults,
  calculatePauseMetrics,
  compareTranscript,
  countWords,
  detectFillers,
  formatDuration,
  getCoachMessage,
  getPreviousAnalysedSession,
  getQuickTrainSectionIndexes,
  getWeakSectionIndexes,
  locateTranscriptPosition,
  parseSectionSelection,
  secondsForPace,
  splitSections,
  transformSection,
} from "../lib/rehearsal";
import type { PracticeSession } from "../lib/app-types";

function session(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "session",
    scriptId: "script",
    scriptTitle: "Test",
    mode: "full",
    durationSeconds: 60,
    targetSeconds: 60,
    estimatedWpm: 100,
    completionPercent: 100,
    confidence: 3,
    sectionsCompleted: 2,
    totalSections: 2,
    completedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe("rehearsal helpers", () => {
  it("splits paragraph sections", () => expect(splitSections("Opening.\n\nMain.\n\nClosing.")).toEqual(["Opening.", "Main.", "Closing."]));

  it("parses canonical focused-section routes without turning an absent value into section zero", () => {
    expect([...parseSectionSelection(undefined)]).toEqual([]);
    expect([...parseSectionSelection("2, 0,invalid,-1")]).toEqual([2, 0]);
  });

  it("implements the exact six-stage progressive-memory sequence", () => {
    expect(PROGRESSIVE_STAGES.map((stage) => stage.description)).toEqual(["100% Text", "75% Text", "50% Text", "Keywords", "First Letters", "Blind"]);
    expect(transformSection("one two three four", "progressive", 0)).toBe("one two three four");
    expect(transformSection("one two three four", "progressive", 1)).toBe("one two three ••••");
    expect(transformSection("one two three four", "progressive", 2)).toBe("one ••• three ••••");
    expect(transformSection("Master your message.", "progressive", 4)).toBe("M Y M.");
    expect(transformSection("Hidden", "progressive", 5)).toContain("memory");
  });

  it("creates standalone keyword and blind outputs", () => {
    expect(transformSection("Build confidence through deliberate rehearsal", "keywords")).toContain("confidence");
    expect(transformSection("Hidden", "blind")).toContain("memory");
  });

  it("counts Unicode words and formats time", () => {
    expect(countWords("Café déjà vu")).toBe(3);
    expect(formatDuration(134)).toBe("2:14");
  });

  it("turns a chosen speaking pace into a nonzero section-time guide", () => {
    expect(secondsForPace("one two three four five", 100)).toBe(3);
    expect(secondsForPace("one two three four five", 50)).toBe(6);
    expect(secondsForPace("", 100)).toBe(0);
  });

  it("separates alignment operations", () => {
    const result = compareTranscript("We deliver the clear message today", "we deliver a message today confidently");
    expect(result).toMatchObject({ correctWords: 4, substitutions: 1, missingWords: 1, additionalWords: 1, accuracyPercent: 67 });
  });

  it("uses aligned content rather than raw transcript length for live following", () => {
    expect(locateTranscriptPosition(["Alpha beta", "Gamma delta"], "alpha beta unrelated unrelated gamma")).toEqual({ sectionIndex: 1, wordIndex: 0, matchedWords: 3 });
    expect(locateTranscriptPosition(["Alpha beta", "Gamma delta"], "unrelated words only")).toEqual({ sectionIndex: 0, wordIndex: -1, matchedWords: 0 });
  });

  it("detects configured fillers", () => {
    expect(detectFillers("Um, you know, this is like useful, you know.", ["um", "like", "you know"]))
      .toEqual([{ phrase: "um", count: 1 }, { phrase: "like", count: 1 }, { phrase: "you know", count: 2 }]);
  });

  it("measures pause gaps", () => {
    expect(calculatePauseMetrics([{ start: 0, end: 1 }, { start: 1.4, end: 2 }, { start: 3.2, end: 4 }, { start: 6, end: 7 }]))
      .toEqual({ pauseCount: 2, hesitationSeconds: 3.2, longestPauseSeconds: 2 });
  });

  it("marks low accuracy, retries, and reveals weak", () => {
    const comparison = compareTranscript("Opening words Closing words", "Opening words wrong words");
    const sections = buildSectionResults(["Opening words", "Closing words"], comparison.alignments, { 1: 1 }, new Set([1]));
    expect(sections[0].weak).toBe(false);
    expect(sections[1]).toMatchObject({ weak: true, retries: 1, revealed: true });
  });

  it("finds weak sections and Quick Train priorities from history and script signals", () => {
    const history = session({
      sectionResults: [
        { sectionIndex: 0, sectionLabel: "Section 1", accuracyPercent: 95, retries: 0, revealed: false, weak: false },
        { sectionIndex: 1, sectionLabel: "Section 2", accuracyPercent: 70, retries: 1, revealed: false, weak: true },
      ],
    });
    expect(getWeakSectionIndexes([history], "script")).toEqual([1]);
    expect(getQuickTrainSectionIndexes(["Welcome everyone", "Revenue grew 25 percent", "Finally take action"], [history], "script")).toEqual([0, 1, 2]);
  });

  it("finds the previous analysed take for an improvement comparison", () => {
    const earlier = session({ id: "earlier", analysisStatus: "complete", accuracyPercent: 72, completedAt: "2026-01-01T10:00:00.000Z" });
    const otherScript = session({ id: "other", scriptId: "other", analysisStatus: "complete", accuracyPercent: 99, completedAt: "2026-01-02T10:00:00.000Z" });
    const current = session({ id: "current", analysisStatus: "complete", accuracyPercent: 84, completedAt: "2026-01-03T10:00:00.000Z" });
    expect(getPreviousAnalysedSession([current, otherScript, earlier], current)?.id).toBe("earlier");
  });

  it("never invents coaching without measured speech and uses real weakest-section data when measured", () => {
    expect(getCoachMessage({ analysisStatus: "failed", completionPercent: 100, estimatedWpm: 120, durationSeconds: 60, targetSeconds: 60 })).toContain("No speech score");
    expect(getCoachMessage({ analysisStatus: "complete", completionPercent: 100, accuracyPercent: 82, missingWords: 5, estimatedWpm: 125, durationSeconds: 60, targetSeconds: 60, sectionResults: [{ sectionIndex: 1, sectionLabel: "Section 2", accuracyPercent: 68, retries: 0, revealed: false, weak: true }] })).toContain("Section 2 was your weakest at 68%");
    expect(getCoachMessage({ analysisStatus: "complete", completionPercent: 100, accuracyPercent: 90, previousAccuracy: 80, estimatedWpm: 125, durationSeconds: 60, targetSeconds: 60 })).toContain("improved from 80% to 90%");
    expect(getCoachMessage({ analysisStatus: "complete", completionPercent: 100, accuracyPercent: 95, fillerCount: 6, estimatedWpm: 125, durationSeconds: 60, targetSeconds: 60 })).toContain("6 filler words");
  });
});

import { describe, expect, it } from "vitest";

import { hydrateAppState } from "../lib/app-store";
import type { AppState } from "../lib/app-types";

describe("local rehearsal history persistence", () => {
  it("hydrates a measured attempt, script metadata, and settings without losing analysis", () => {
    const state: AppState = {
      scripts: [{ id: "script", title: "Keynote", content: "Opening\n\nClosing", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", targetSeconds: 90, sourceFormat: "pptx", sourceFilename: "keynote.pptx" }],
      sessions: [{
        id: "take", scriptId: "script", scriptTitle: "Keynote", mode: "full", durationSeconds: 78, targetSeconds: 90,
        estimatedWpm: 120, spokenWpm: 116, completionPercent: 96, accuracyPercent: 91, confidence: 3,
        sectionsCompleted: 2, totalSections: 2, completedAt: "2026-01-02T00:00:00.000Z", analysisStatus: "complete",
        transcript: "Opening Closing", correctWords: 2, missingWords: 0, additionalWords: 0, substitutions: 0,
        fillerCount: 0, pauseCount: 1, audioUri: "file:///documents/rehearsals/take.m4a",
      }],
      settings: { theme: "blue", reduceMotion: false, focusMode: true, fillerWords: ["um", "so"] },
    };

    const restored = hydrateAppState(JSON.stringify(state));
    expect(restored).toEqual(state);
    expect(restored.sessions[0]).toMatchObject({ accuracyPercent: 91, spokenWpm: 116, transcript: "Opening Closing", analysisStatus: "complete" });
  });
});

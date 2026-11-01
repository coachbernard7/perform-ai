import { describe, expect, it, vi } from "vitest";

import { analyseTranscript } from "../server/rehearsal/analyse";
import { transcribeRecordedAudio, type TranscriptionProvider } from "../server/rehearsal/transcribe";

const providerResult = {
  text: "Open clearly um then close now",
  language: "en",
  duration: 6,
  segments: [
    { start: 0, end: 1.2, text: "Open clearly" },
    { start: 2.3, end: 3.2, text: "um then" },
    { start: 4.5, end: 6, text: "close now" },
  ],
};

describe("transcription and analysis pipeline", () => {
  it("accepts a replaceable provider and forwards validated audio", async () => {
    const transcribe = vi.fn(async () => providerResult);
    const provider: TranscriptionProvider = { id: "fixture", transcribe };
    const bytes = new Uint8Array(128).fill(1);

    await expect(transcribeRecordedAudio({ bytes, mimeType: "audio/webm", language: "en-GB" }, provider)).resolves.toEqual(providerResult);
    expect(transcribe).toHaveBeenCalledWith(expect.objectContaining({ bytes, mimeType: "audio/webm", language: "en-GB" }));
  });

  it("rejects invalid media before calling the provider", async () => {
    const provider: TranscriptionProvider = { id: "fixture", transcribe: vi.fn(async () => providerResult) };
    await expect(transcribeRecordedAudio({ bytes: new Uint8Array(127), mimeType: "audio/webm" }, provider)).rejects.toThrow("between 128 bytes and 16 MB");
    await expect(transcribeRecordedAudio({ bytes: new Uint8Array(128), mimeType: "video/mp4" }, provider)).rejects.toThrow("Unsupported recording format");
    expect(provider.transcribe).not.toHaveBeenCalled();
  });

  it("turns a timestamped transcript into measured accuracy, pace, pauses, fillers and weak sections", () => {
    const analysis = analyseTranscript({
      expectedText: "Open clearly then close now",
      sections: ["Open clearly", "then close now"],
      fillerWords: ["um"],
      retries: { 1: 1 },
      revealed: new Set(),
    }, providerResult);

    expect(analysis).toMatchObject({
      transcript: providerResult.text,
      correctWords: 5,
      additionalWords: 1,
      accuracyPercent: 100,
      completionPercent: 100,
      spokenWpm: 60,
      fillerCount: 1,
      pauseCount: 2,
      longestPauseSeconds: 1.3,
    });
    expect(analysis.sectionResults[1]).toMatchObject({ retries: 1, weak: true });
  });
});

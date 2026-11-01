import { readFile } from "node:fs/promises";

import { analyseTranscript } from "../server/rehearsal/analyse";
import { transcribeRecordedAudio } from "../server/rehearsal/transcribe";

async function main() {
  const [audioPath, expectedText] = process.argv.slice(2);
  if (!audioPath || !expectedText) {
    throw new Error("Usage: tsx scripts/run_local_transcription_probe.ts <wav-path> <expected-text>");
  }

  const bytes = new Uint8Array(await readFile(audioPath));
  const transcript = await transcribeRecordedAudio({
    bytes,
    mimeType: "audio/wav",
    language: "en",
    prompt: `Speech rehearsal test. Expected text: ${expectedText}`,
  });
  const analysis = analyseTranscript({
    expectedText,
    sections: [expectedText],
    fillerWords: ["um", "uh", "erm", "like"],
  }, transcript);

  console.log(JSON.stringify({
    providerTranscript: transcript.text,
    language: transcript.language,
    durationSeconds: transcript.duration,
    segments: transcript.segments.length,
    accuracyPercent: analysis.accuracyPercent,
    completionPercent: analysis.completionPercent,
    correctWords: analysis.correctWords,
    missingWords: analysis.missingWords,
    additionalWords: analysis.additionalWords,
    substitutions: analysis.substitutions,
    fillerCount: analysis.fillerCount,
    spokenWpm: analysis.spokenWpm,
    pauseCount: analysis.pauseCount,
  }, null, 2));
}

void main();

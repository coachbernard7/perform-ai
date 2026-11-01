import { readFile } from "node:fs/promises";

import { appRouter } from "../server/routers";

async function main() {
  const [audioPath, expectedText] = process.argv.slice(2);
  if (!audioPath || !expectedText) {
    throw new Error("Usage: tsx scripts/run_local_rehearsal_route_probe.ts <wav-path> <expected-text>");
  }

  const audioBase64 = (await readFile(audioPath)).toString("base64");
  const caller = appRouter.createCaller({
    req: { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } } as never,
    res: { clearCookie: () => undefined } as never,
    user: null,
  });
  const result = await caller.rehearsal.transcribeAndAnalyze({
    audioBase64,
    mimeType: "audio/wav",
    expectedText,
    sections: [expectedText],
    fillerWords: ["um", "uh", "erm", "like"],
    retries: {},
    revealed: [],
  });

  console.log(JSON.stringify({
    transcript: result.transcript,
    accuracyPercent: result.accuracyPercent,
    completionPercent: result.completionPercent,
    correctWords: result.correctWords,
    missingWords: result.missingWords,
    additionalWords: result.additionalWords,
    substitutions: result.substitutions,
    spokenWpm: result.spokenWpm,
    pauseCount: result.pauseCount,
    sectionResults: result.sectionResults,
  }, null, 2));
}

void main();

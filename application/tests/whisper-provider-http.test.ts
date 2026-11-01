import { createServer, type Server } from "node:http";
import { once } from "node:events";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { analyseTranscript } from "../server/rehearsal/analyse";
import { WhisperCompatibleProvider } from "../server/rehearsal/transcription-provider";
import { transcribeRecordedAudio } from "../server/rehearsal/transcribe";

let server: Server;
let baseUrl = "";
let captured = { method: "", url: "", authorization: "", body: "" };

beforeAll(async () => {
  server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    captured = {
      method: request.method ?? "",
      url: request.url ?? "",
      authorization: request.headers.authorization ?? "",
      body: Buffer.concat(chunks).toString("latin1"),
    };
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({
      text: "Open clearly um then close now",
      language: "en",
      duration: 6,
      segments: [
        { start: 0, end: 1.1, text: "Open clearly" },
        { start: 2.4, end: 3.1, text: "um then" },
        { start: 4.3, end: 6, text: "close now" },
      ],
    }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Local transcription fixture did not bind a port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.close();
  await once(server, "close");
});

describe("Whisper-compatible local transcription contract", () => {
  it("uploads an accepted WAV recording, reads verbose JSON, and produces a real comparison", async () => {
    const provider = new WhisperCompatibleProvider({ baseUrl, apiKey: "local-test-key", model: "whisper-local" });
    const transcript = await transcribeRecordedAudio({
      bytes: new Uint8Array(256).fill(7),
      mimeType: "audio/wav",
      language: "en-GB",
      prompt: "Speech rehearsal test.",
    }, provider);

    expect(captured).toMatchObject({
      method: "POST",
      url: "/v1/audio/transcriptions",
      authorization: "Bearer local-test-key",
    });
    expect(captured.body).toContain('name="file"; filename="rehearsal.wav"');
    expect(captured.body).toContain('name="model"');
    expect(captured.body).toContain("whisper-local");
    expect(captured.body).toContain('name="response_format"');
    expect(captured.body).toContain("verbose_json");

    expect(transcript).toMatchObject({
      text: "Open clearly um then close now",
      language: "en",
      duration: 6,
    });

    const analysis = analyseTranscript({
      expectedText: "Open clearly then close now",
      sections: ["Open clearly", "then close now"],
      fillerWords: ["um"],
    }, transcript);
    expect(analysis).toMatchObject({
      accuracyPercent: 100,
      completionPercent: 100,
      correctWords: 5,
      additionalWords: 1,
      fillerCount: 1,
      pauseCount: 2,
      longestPauseSeconds: 1.3,
    });
  });
});

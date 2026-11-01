import { ENV } from "../_core/env";

export type TranscriptSegment = { start: number; end: number; text: string };
export type TranscriptResult = { text: string; language: string; duration: number; segments: TranscriptSegment[] };
export type TranscriptionInput = { bytes: Uint8Array; mimeType: string; prompt?: string; language?: string };

export interface TranscriptionProvider {
  readonly id: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptResult>;
}

const EXTENSIONS: Record<string, string> = {
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

export class WhisperCompatibleProvider implements TranscriptionProvider {
  readonly id = "whisper-compatible";

  constructor(private readonly config: { baseUrl: string; apiKey: string; model?: string }) {}

  async transcribe(input: TranscriptionInput): Promise<TranscriptResult> {
    const extension = EXTENSIONS[input.mimeType];
    if (!extension) throw new Error("Unsupported recording format.");
    const form = new FormData();
    const buffer = input.bytes.buffer.slice(input.bytes.byteOffset, input.bytes.byteOffset + input.bytes.byteLength) as ArrayBuffer;
    form.append("file", new Blob([buffer], { type: input.mimeType }), `rehearsal.${extension}`);
    form.append("model", this.config.model ?? "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("language", input.language ?? "en");
    form.append("prompt", (input.prompt || "Transcribe this speech rehearsal faithfully, including filler words.").slice(0, 500));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const endpoint = new URL("v1/audio/transcriptions", `${this.config.baseUrl.replace(/\/+$/, "")}/`).toString();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Accept-Encoding": "identity" },
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Transcription failed (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ""}`);
      }
      const payload = await response.json() as any;
      if (typeof payload.text !== "string") throw new Error("The transcription service returned an invalid response.");
      return {
        text: payload.text.trim(),
        language: typeof payload.language === "string" ? payload.language : input.language ?? "en",
        duration: typeof payload.duration === "number" ? payload.duration : 0,
        segments: (payload.segments ?? [])
          .filter((segment: any) => typeof segment.start === "number" && typeof segment.end === "number")
          .map((segment: any) => ({ start: segment.start, end: segment.end, text: typeof segment.text === "string" ? segment.text.trim() : "" })),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createConfiguredTranscriptionProvider(): TranscriptionProvider {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) throw new Error("Speech transcription is not configured on this server.");
  return new WhisperCompatibleProvider({ baseUrl: ENV.forgeApiUrl, apiKey: ENV.forgeApiKey });
}

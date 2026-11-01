import {
  createConfiguredTranscriptionProvider,
  type TranscriptResult,
  type TranscriptionInput,
  type TranscriptionProvider,
} from "./transcription-provider";

export type { TranscriptResult, TranscriptSegment, TranscriptionProvider } from "./transcription-provider";

const SUPPORTED_TYPES = new Set(["audio/m4a", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"]);
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

export async function transcribeRecordedAudio(
  input: TranscriptionInput,
  provider: TranscriptionProvider = createConfiguredTranscriptionProvider(),
): Promise<TranscriptResult> {
  if (!SUPPORTED_TYPES.has(input.mimeType)) throw new Error("Unsupported recording format.");
  if (input.bytes.byteLength < 128 || input.bytes.byteLength > MAX_AUDIO_BYTES) {
    throw new Error("Recording must be between 128 bytes and 16 MB.");
  }
  const result = await provider.transcribe(input);
  if (!result.text.trim()) throw new Error("The transcription service returned an empty transcript.");
  return result;
}

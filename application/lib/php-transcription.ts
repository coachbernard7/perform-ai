import { performEndpoint } from "./hosting";
export async function transcribeWebRecording(uri: string, account: string, csrfToken: string): Promise<string> {
  const recording = await fetch(uri); if (!recording.ok) throw new Error("The browser recording could not be read.");
  const blob = await recording.blob();
  if (blob.size > 5 * 1024 * 1024) throw new Error("Keep test recordings under the 5 MB transcription limit.");
  const form = new FormData(); form.append("account", account); form.append("audio", blob, "practice-audio");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch(performEndpoint("transcribe.php"), { method:"POST", credentials:"include", signal:controller.signal, headers:{"X-Perform-AI-CSRF":csrfToken}, body:form });
    const payload = await response.json() as {ok?:boolean; text?:string; error?:string};
    if (!response.ok || !payload.ok || !payload.text) throw new Error(payload.error || "Transcription is unavailable.");
    return payload.text;
  } finally { clearTimeout(timer); }
}

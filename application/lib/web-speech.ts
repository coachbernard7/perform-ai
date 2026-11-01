type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type WebSpeechController = {
  supported: boolean;
  start: (options?: { reset?: boolean }) => void;
  stop: () => void;
  reset: () => void;
  getTranscript: () => string;
};

const unsupportedController: WebSpeechController = {
  supported: false,
  start: () => undefined,
  stop: () => undefined,
  reset: () => undefined,
  getTranscript: () => "",
};

export function createWebSpeechController(
  onTranscript: (text: string, isFinal: boolean) => void,
  options: { language?: string; onError?: (message: string) => void } = {},
): WebSpeechController {
  if (typeof window === "undefined") return unsupportedController;
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Recognition) return unsupportedController;

  const recognition = new Recognition() as BrowserRecognition;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options.language ?? "en-GB";
  let finalText = "";
  let active = false;

  recognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const value = String(event.results[index][0]?.transcript ?? "").trim();
      if (event.results[index].isFinal) finalText = `${finalText} ${value}`.trim();
      else interim = `${interim} ${value}`.trim();
    }
    onTranscript(`${finalText} ${interim}`.trim(), !interim);
  };
  recognition.onerror = (event) => {
    const code = typeof event?.error === "string" ? event.error : "recognition-error";
    if (!['aborted', 'no-speech'].includes(code)) options.onError?.(code);
  };
  recognition.onend = () => {
    if (active) {
      try { recognition.start(); } catch { /* Browser is already restarting. */ }
    }
  };

  const reset = () => {
    finalText = "";
    onTranscript("", true);
  };

  return {
    supported: true,
    start: (startOptions) => {
      if (startOptions?.reset) reset();
      active = true;
      try { recognition.start(); } catch { /* Recognition is already active. */ }
    },
    stop: () => {
      active = false;
      try { recognition.stop(); } catch { recognition.abort(); }
    },
    reset,
    getTranscript: () => finalText,
  };
}

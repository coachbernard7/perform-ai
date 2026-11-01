import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { AppSettings, AppState, PracticeSession, ScriptDocument, ThemeName, ThemePalette } from "./app-types";
import { DEFAULT_FILLER_WORDS } from "./rehearsal";
import { rehearsalStorageKey } from "./account-storage";


const SAMPLE_SCRIPT: ScriptDocument = {
  id: "welcome-script",
  title: "Private rehearsal",
  content: "Add your own private script.",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  targetSeconds: 75,
};

const INITIAL_STATE: AppState = {
  scripts: [SAMPLE_SCRIPT],
  sessions: [],
  settings: { theme: "blue", reduceMotion: false, focusMode: false, fillerWords: DEFAULT_FILLER_WORDS },
};

export function hydrateAppState(stored: string | null): AppState {
  if (!stored) return INITIAL_STATE;
  const parsed = JSON.parse(stored) as Partial<AppState>;
  return {
    scripts: parsed.scripts?.length ? parsed.scripts : [SAMPLE_SCRIPT],
    sessions: parsed.sessions ?? [],
    settings: {
      ...INITIAL_STATE.settings,
      ...parsed.settings,
      theme: parsed.settings?.theme === "alpha-omega" || parsed.settings?.theme === "matrix" ? "blue" : (parsed.settings?.theme ?? "blue"),
      fillerWords: parsed.settings?.fillerWords?.length ? parsed.settings.fillerWords : DEFAULT_FILLER_WORDS,
    },
  };
}

export const THEME_LABELS: Record<ThemeName, string> = {
  "alpha-omega": "Black + Gold",
  "black-blue": "Black + Light Blue",
  "black-gold": "Black + Gold",
  matrix: "Blue + Green Rain",
  white: "White + Black / Blue",
  blue: "Blue + Green Rain",
};

export const THEME_PALETTES: Record<ThemeName, ThemePalette> = {
  "alpha-omega": {
    background: "#050403", backgroundEnd: "#171006", surface: "#12100B", surfaceAlt: "#201A0E",
    text: "#F8D77A", muted: "#B9AA85", border: "#4D3A12", primary: "#F5B324", accent: "#FFE19A",
    success: "#38EF7D", warning: "#F7C95C", danger: "#FF6B6B",
  },
  "black-blue": {
    background: "#02050A", backgroundEnd: "#071322", surface: "#08111E", surfaceAlt: "#0C1D32",
    text: "#EAF8FF", muted: "#84A7BC", border: "#133C58", primary: "#22C8FF", accent: "#70E1FF",
    success: "#3FE89B", warning: "#FFD166", danger: "#FF6B7A",
  },
  "black-gold": {
    background: "#050403", backgroundEnd: "#171006", surface: "#12100B", surfaceAlt: "#201A0E",
    text: "#F8D77A", muted: "#B9AA85", border: "#4D3A12", primary: "#F5B324", accent: "#FFE19A",
    success: "#6EE7A8", warning: "#F5B324", danger: "#FF7C6E",
  },
  matrix: {
    background: "#07152B", backgroundEnd: "#0A2B4A", surface: "#0C2440E8", surfaceAlt: "#123657E8",
    text: "#C5FFD6", muted: "#8BDBA5", border: "#1C6C49", primary: "#39FF88", accent: "#8BFFB5",
    success: "#39FF88", warning: "#D6F06A", danger: "#FF6868",
  },
  white: {
    background: "#F5F8FC", backgroundEnd: "#EAF1F8", surface: "#FFFFFF", surfaceAlt: "#EEF4FA",
    text: "#10233B", muted: "#5D7188", border: "#D5E1EC", primary: "#135B9D", accent: "#0089B8",
    success: "#178A52", warning: "#A46D00", danger: "#C33D3D",
  },
  blue: {
    background: "#07152B", backgroundEnd: "#0A2B4A", surface: "#0C2440", surfaceAlt: "#123657",
    text: "#C5FFD6", muted: "#8BDBA5", border: "#1C6C49", primary: "#39FF88", accent: "#8BFFB5",
    success: "#47E6A3", warning: "#FFD166", danger: "#FF7B7B",
  },
};

type StoreValue = AppState & {
  ready: boolean;
  palette: ThemePalette;
  addScript: (input: Pick<ScriptDocument, "title" | "content" | "targetSeconds"> & Partial<Pick<ScriptDocument, "sourceFormat" | "sourceFilename" | "extractionWarnings" | "slides">>) => ScriptDocument;
  deleteScript: (id: string) => void;
  addSession: (session: PracticeSession) => void;
  updateSession: (id: string, patch: Partial<PracticeSession>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
};

const AppStoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children, accountId = null }: PropsWithChildren<{ accountId?: string | null }>) {
  const storageKey = rehearsalStorageKey(accountId);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [ready, setReady] = useState(false);
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (stored && !cancelled) setState(hydrateAppState(stored));
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [storageKey]);

  const commit = (producer: (current: AppState) => AppState) => {
    setState((current) => {
      const next = producer(current);
      pendingWrite.current = pendingWrite.current.catch(() => undefined).then(() => AsyncStorage.setItem(storageKey, JSON.stringify(next)));
      return next;
    });
  };

  const value = useMemo<StoreValue>(() => ({
    ...state,
    ready,
    palette: THEME_PALETTES[state.settings.theme],
    addScript: (input) => {
      const now = new Date().toISOString();
      const script: ScriptDocument = {
        ...input,
        id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      commit((current) => ({ ...current, scripts: [script, ...current.scripts] }));
      return script;
    },
    deleteScript: (id) => commit((current) => ({
      ...current,
      scripts: current.scripts.filter((script) => script.id !== id),
      sessions: current.sessions.filter((session) => session.scriptId !== id),
    })),
    addSession: (session) => commit((current) => ({ ...current, sessions: [session, ...current.sessions] })),
    updateSession: (id, patch) => commit((current) => ({ ...current, sessions: current.sessions.map((session) => session.id === id ? { ...session, ...patch } : session) })),
    updateSettings: (settings) => commit((current) => ({
      ...current,
      settings: { ...current.settings, ...settings },
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, ready]);

  return <AppStoreContext.Provider value={value}>{ready ? children : null}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error("useAppStore must be used inside AppStoreProvider");
  return context;
}

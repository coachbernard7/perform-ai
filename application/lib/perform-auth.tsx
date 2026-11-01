import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { performEndpoint, performBasePath } from "./hosting";

export type MembershipState = "permanent_free_trial" | "pending_manual_verification" | "standard";
export type PerformAccount = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "user";
  membership: MembershipState;
  selectedPlan: string | null;
  phone: string;
  thumbnailUrl: string | null;
};

type StatusPayload = { ok: boolean; authenticated: boolean; account: PerformAccount | null; csrfToken: string; error?: string; message?: string };
type LoginResult = { ok: boolean; error?: string; message?: string };
type RegisterInput = { name: string; username: string; email: string; password: string; plan: string };

type AuthValue = {
  ready: boolean;
  account: PerformAccount | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  register: (input: RegisterInput) => Promise<LoginResult>;
  logout: () => Promise<void>;
  uploadThumbnail: (uri: string, mimeType?: string | null) => Promise<LoginResult>;
  loginUrl: string;
};

const AuthContext = createContext<AuthValue | null>(null);

function phpEndpoint(path: string): string {
  if (Platform.OS === "web") return performEndpoint(path);
  return `https://performai.co.uk/app/${path}`;
}

function imageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (Platform.OS === "web") return path;
  return `https://performai.co.uk/app/${path}`;
}

function normaliseAccount(account: PerformAccount): PerformAccount {
  return { ...account, thumbnailUrl: imageUrl(account.thumbnailUrl) };
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The account service returned an unexpected response.");
  }
}

export function PerformAuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<PerformAccount | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  const applyAuthenticatedPayload = useCallback((payload: StatusPayload) => {
    if (payload.account) setAccount(normaliseAccount(payload.account));
    setCsrfToken(payload.csrfToken);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(phpEndpoint("account-auth.php?action=status"), { credentials: "include", headers: { Accept: "application/json" } });
      const payload = await readJson<StatusPayload>(response);
      if (response.ok && payload.ok) {
        if (payload.account) applyAuthenticatedPayload(payload);
        else {
          setAccount(null);
          setCsrfToken(payload.csrfToken);
        }
      } else {
        setAccount(null);
        setCsrfToken(null);
      }
    } catch {
      setAccount(null);
      setCsrfToken(null);
    } finally {
      setReady(true);
    }
  }, [applyAuthenticatedPayload]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof BroadcastChannel === "undefined") return;
    const connection = new BroadcastChannel(`perform-ai-auth:${performBasePath}`);channel.current=connection;
    connection.onmessage = event => { if (event.data === "changed") void refresh(); };
    return () => { connection.close();channel.current=null; };
  }, [refresh]);

  const authenticate = useCallback(async (action: "login" | "register", payloadBody: Record<string, string>): Promise<LoginResult> => {
    try {
      const response = await fetch(phpEndpoint(`account-auth.php?action=${action}`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payloadBody),
      });
      const payload = await readJson<StatusPayload>(response);
      if (!response.ok || !payload.ok || !payload.account) return { ok: false, error: payload.error ?? "The account request was not accepted." };
      applyAuthenticatedPayload(payload);
      channel.current?.postMessage("changed");
      return { ok: true, message: payload.message };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "The account service is unavailable." };
    }
  }, [applyAuthenticatedPayload]);

  const login = useCallback((identifier: string, password: string) => authenticate("login", { identifier, password }), [authenticate]);
  const register = useCallback((input: RegisterInput) => authenticate("register", input), [authenticate]);

  const logout = useCallback(async () => {
    try {
      await fetch(phpEndpoint("account-auth.php?action=logout"), {
        method: "POST", credentials: "include", headers: { Accept: "application/json", "X-Perform-AI-CSRF": csrfToken ?? "" },
      });
    } finally {
      setAccount(null);
      setCsrfToken(null);
      channel.current?.postMessage("changed");
    }
  }, [csrfToken]);

  const uploadThumbnail = useCallback(async (uri: string, mimeType?: string | null): Promise<LoginResult> => {
    if (!account || !csrfToken) return { ok: false, error: "Log in before setting a profile thumbnail." };
    try {
      const form = new FormData();
      const type = mimeType || "image/jpeg";
      if (Platform.OS === "web") {
        const blob = await (await fetch(uri)).blob();
        form.append("thumbnail", blob, "perform-ai-profile.jpg");
      } else {
        form.append("thumbnail", { uri, type, name: "perform-ai-profile.jpg" } as unknown as Blob);
      }
      const response = await fetch(phpEndpoint("profile-thumbnail.php?action=upload"), {
        method: "POST", credentials: "include", headers: { Accept: "application/json", "X-Perform-AI-CSRF": csrfToken }, body: form,
      });
      const payload = await readJson<{ ok: boolean; thumbnailUrl?: string; error?: string }>(response);
      if (!response.ok || !payload.ok || !payload.thumbnailUrl) return { ok: false, error: payload.error ?? "Profile thumbnail upload failed." };
      setAccount((current) => current ? { ...current, thumbnailUrl: imageUrl(payload.thumbnailUrl ?? null) } : current);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Profile thumbnail upload failed." };
    }
  }, [account, csrfToken]);

  const value = useMemo<AuthValue>(() => ({
    ready, account, csrfToken, isAuthenticated: account !== null, login, register, logout, uploadThumbnail, loginUrl: "/login",
  }), [account, csrfToken, login, register, logout, ready, uploadThumbnail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePerformAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("usePerformAuth must be used inside PerformAuthProvider");
  return value;
}

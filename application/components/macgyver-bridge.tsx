import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { usePerformAuth } from "@/lib/perform-auth";
import { performBasePath, performEndpoint } from "@/lib/hosting";

type Context = { account: string | null; displayName: string; csrfToken: string | null; screen: string; suspended: boolean };
type Instance = { setContext: (context: Context) => void; pause: () => void; destroy: () => void };
type Factory = { mount: (options: { appId: string; appName: string; endpoint: string; avatarUrl: string; onLogin: () => void; onNavigate: (target: string) => Promise<string> }) => Instance };
declare global { interface Window { AOMacgyver?: Factory } }
let loading: Promise<Factory> | null = null;
function loadWidget(): Promise<Factory> {
  if (window.AOMacgyver) return Promise.resolve(window.AOMacgyver);
  if (!loading) loading = new Promise<Factory>((resolve, reject) => {
    const script = document.createElement("script"); script.src = `${__DEV__ ? "" : performBasePath}/macgyver-widget.js?v=1`;
    script.onload = () => window.AOMacgyver ? resolve(window.AOMacgyver) : reject(new Error("Macgyver could not start."));
    script.onerror = () => { loading = null; reject(new Error("Macgyver could not load.")); };
    document.head.append(script);
  });
  return loading;
}

/** Web adapter. The standalone widget can be reused by other apps with their own backend. */
export function MacgyverBridge() {
  const { account, csrfToken } = usePerformAuth(); const pathname = usePathname(); const router = useRouter();
  const current = useRef<Context>({ account: null, displayName: "", csrfToken: null, screen: "", suspended: false });
  const instance = useRef<Instance | null>(null);
  useEffect(() => {
    current.current = { account: account?.id ?? null, displayName: account?.name ?? "", csrfToken, screen: pathname, suspended: pathname.startsWith("/rehearse") };
    instance.current?.setContext(current.current);
  }, [account, csrfToken, pathname]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    let cancelled = false;
    void loadWidget().then(factory => {
      if (cancelled) return;
      const routes = {home:"/", training:"/train", library:"/files", scores:"/scores", profile:"/profile", "new-script":"/script/new"} as const;
      instance.current = factory.mount({ appId:"perform-ai", appName:"Perform AI", endpoint:performEndpoint("macgyver.php"), avatarUrl:`${__DEV__ ? "" : performBasePath}/macgyver-guardian.png`,
        onLogin: () => router.push("/login"),
        onNavigate: async target => {
          if (!(target in routes)) throw new Error("That action is not available in Perform AI.");
          if (!current.current.account) throw new Error("Sign in before opening private tools.");
          const destination = routes[target as keyof typeof routes]; router.push(destination);
          return `Opening ${target.replace("-", " ")}…`;
        },
      });
      instance.current.setContext(current.current);
    }).catch(() => { /* Keep the app usable if a static widget asset fails. */ });
    return () => { cancelled = true; instance.current?.destroy(); instance.current = null; };
  }, [router]);
  return null;
}

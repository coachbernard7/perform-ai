import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const injector = readFileSync(new URL("scripts/inject_perform_ai_web_shell.mjs", root), "utf8");

describe("PERFORM AI PWA registration", () => {
  it("registers the service worker only on an HTTPS deployment", () => {
    expect(injector).toContain("location.protocol==='https:'");
    expect(injector).toContain("navigator.serviceWorker.register('/app/service-worker.js'");
  });
});

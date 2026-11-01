import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const appShell = readFileSync(new URL("components/app-ui.tsx", root), "utf8");

describe("authenticated app shell", () => {
  it("provides a universal visible logout control", () => {
    expect(appShell).toContain('accessibilityLabel="Log out"');
    expect(appShell).toContain('>Log out</Text>');
    expect(appShell).toContain("const { account, isAuthenticated, logout } = usePerformAuth()");
  });

  it("keeps the universal control inside the safe app shell rather than only on Profile", () => {
    expect(appShell).toContain("isAuthenticated ? <View accessibilityRole=\"toolbar\" accessibilityLabel=\"Account session\"");
    expect(appShell).toContain("isAuthenticated && styles.withAccountDock");
  });
});

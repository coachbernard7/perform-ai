import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("PERFORM AI visual identity defaults", () => {
  it("defaults to blue with green text and rain while retaining exact black-gold, black-blue, and white modes", () => {
    const source = read("lib/app-store.tsx");
    expect(source).toContain('theme: "blue"');
    expect(source).toContain('parsed.settings?.theme === "matrix"');
    expect(source).toContain('background: "#07152B"');
    expect(source).toContain('text: "#C5FFD6"');
    expect(source).toContain('primary: "#39FF88"');
    expect(source).toContain('text: "#F8D77A"');
    expect(source).toContain('text: "#EAF8FF"');
    expect(source).toContain('text: "#10233B"');
  });

  it("renders the Saint Bernard icon beneath the native safe area and exposes four global app choices", () => {
    const source = read("components/app-ui.tsx");
    expect(source).toContain('require("../assets/images/icon.png")');
    expect(source).toContain('minHeight: 104');
    expect(source).toContain('paddingTop: 30');
    expect(source).toContain('Blue with green rain');
    expect(source).toContain('Black and gold');
    expect(source).toContain('Black with light blue');
    expect(source).toContain('settings.theme === "blue" ? <MatrixRain');
  });

  it("applies the same four modes to the public gateway and confines green code rain to blue mode", () => {
    const source = read("hostgator/landing-index.html");
    expect(source).toContain('data-theme="blue"');
    expect(source).toContain('data-theme="black-blue"');
    expect(source).toContain('data-theme="white"');
    expect(source).toContain('data-theme="black-gold"');
    expect(source).toContain("root.dataset.theme==='blue'");
  });
});

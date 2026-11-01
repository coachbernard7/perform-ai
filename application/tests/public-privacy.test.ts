import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

describe("public landing privacy", () => {
  it("ships only a non-substantive starter placeholder", () => {
    const store = read("lib/app-store.tsx");
    expect(store).toContain('title: "Private rehearsal"');
    expect(store).toContain('content: "Add your own private script."');
    expect(store).not.toContain("Every strong presentation begins");
    expect(store).not.toContain("Master Your Message");
  });

  it("does not render local script titles or content on the public home route", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).toContain("Private rehearsal.");
    expect(home).toContain("Your private rehearsal space is ready on this device.");
    expect(home).not.toContain("recent.title");
    expect(home).not.toContain("recent.content");
    expect(home).not.toContain("scripts.map");
  });
});

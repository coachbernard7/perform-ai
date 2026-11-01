import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const rehearsal = readFileSync(new URL("app/rehearse.tsx", root), "utf8");

describe("rehearsal recording controls", () => {
  it("exposes labelled pause and resume controls instead of a timer-only play icon", () => {
    expect(rehearsal).toContain('label={running ? "Pause recording" : "Resume recording"}');
    expect(rehearsal).toContain("Start a recording before using pause or resume.");
    expect(rehearsal).toContain("if (started && !audioUri) recorder.record();");
  });

  it("offers pace targets without auto-advancing the script", () => {
    expect(rehearsal).toContain("SCRIPT PACE");
    expect(rehearsal).toContain("You choose when to move to the next section.");
    expect(rehearsal).not.toContain("setIndex((current) => Math.max(current, position.sectionIndex))");
  });

  it("makes stopped-take playback and playback speed visible", () => {
    expect(rehearsal).toContain("REPLAY YOUR TAKE");
    expect(rehearsal).toContain("const PLAYBACK_RATES = [0.75, 1, 1.25]");
    expect(rehearsal).toContain(">{rate}×</Text>");
  });
});

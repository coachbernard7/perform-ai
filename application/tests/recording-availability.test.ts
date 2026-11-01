import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const rehearsal = readFileSync(new URL("app/rehearse.tsx", root), "utf8");

describe("recording analysis availability", () => {
  it("does not imply that a local non-HTTPS iPad timer can analyse audio", () => {
    expect(rehearsal).toContain("This local iPad address is not secure");
    expect(rehearsal).toContain("recording and scoring require an HTTPS address");
    expect(rehearsal).toContain("if (recordingBlocker)");
  });

  it("makes the stop-then-analyse sequence explicit", () => {
    expect(rehearsal).toContain("Recording ready — review or analyse");
    expect(rehearsal).toContain("REPLAY YOUR TAKE");
    expect(rehearsal).toContain('label={audioUri ? "Analyse recording" : "Finish"}');
  });
});

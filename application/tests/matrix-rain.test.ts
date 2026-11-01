import { describe, expect, it } from "vitest";

import { buildMatrixStreams, getMatrixColumnSpec } from "../lib/matrix-rain";

describe("Matrix rain", () => {
  it("builds deterministic full-height code streams", () => {
    const first = buildMatrixStreams(12, 30);
    const second = buildMatrixStreams(12, 30);
    expect(first).toEqual(second);
    expect(first).toHaveLength(12);
    expect(first.every((stream) => Array.from(stream).length === 30)).toBe(true);
    expect(new Set(first).size).toBeGreaterThan(8);
  });

  it("bounds column count and stream length", () => {
    expect(buildMatrixStreams(0, 2)).toHaveLength(1);
    expect(buildMatrixStreams(100, 100)).toHaveLength(32);
    expect(Array.from(buildMatrixStreams(1, 2)[0])).toHaveLength(8);
    expect(Array.from(buildMatrixStreams(1, 100)[0])).toHaveLength(64);
  });

  it("varies delay, duration, opacity, and initial offset safely", () => {
    const specs = Array.from({ length: 12 }, (_, index) => getMatrixColumnSpec(index));
    expect(new Set(specs.map((item) => item.duration)).size).toBeGreaterThan(8);
    for (const spec of specs) {
      expect(spec.delay).toBeGreaterThanOrEqual(0);
      expect(spec.delay).toBeLessThanOrEqual(3600);
      expect(spec.duration).toBeGreaterThanOrEqual(5200);
      expect(spec.duration).toBeLessThanOrEqual(10400);
      expect(spec.opacity).toBeGreaterThanOrEqual(0.34);
      expect(spec.opacity).toBeLessThanOrEqual(0.72);
      expect(spec.startOffset).toBeGreaterThanOrEqual(0);
      expect(spec.startOffset).toBeLessThan(1);
    }
  });
});

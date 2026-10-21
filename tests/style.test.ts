import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENT, funnelLayout, odometerColumns, pal } from "../src/soft.tsx";

// Owain, 2026-10-21: "I wasn't keen on the blue gradient on soft tech as it looked quite cheap."
describe("soft tech look", () => {
  it("draws no glow or gradient anywhere in the scene code", () => {
    const src = readFileSync(new URL("../src/soft.tsx", import.meta.url), "utf8");
    expect(src).not.toMatch(/gradient\(/);
  });
  it("uses one flat accent in both tones", () => {
    expect(pal("light").accent).toBe(ACCENT);
    expect(pal("dark").accent).toBe(ACCENT);
  });
});

describe("odometer", () => {
  it("lands every column on a whole digit on the last frame of the roll", () => {
    for (const [target, places] of [[14, 2], [500, 3], [1234, 4]]) {
      const cols = odometerColumns(target, places, 1);
      expect(cols.every((x) => Number.isInteger(x))).toBe(true);
      expect(cols.join("")).toBe(String(target).padStart(places, "0"));
    }
  });
  it("moves a column only while the one to its right rolls over", () => {
    // 14 at 50%: the value is 7, so the tens column has not moved yet.
    expect(odometerColumns(14, 2, 0.5)).toEqual([0, 7]);
    // Between 9 and 10 the tens column turns with the units.
    const [tens, units] = odometerColumns(14, 2, 9.5 / 14);
    expect(tens).toBeCloseTo(0.5);
    expect(units).toBeCloseTo(9.5);
  });
});

describe("card padding", () => {
  it("leaves the same padding under the last row as above the kicker", () => {
    for (const items of [[], [{ text: "a" }, { text: "b" }]])
      for (const n of [0, 2, 5]) {
        const v = { kind: "funnel", items, target: { kicker: "k", title: "T", lines: Array.from({ length: n }, (_, i) => ({ text: `l${i}` })) } } as never;
        const g = funnelLayout(v, 900, 900)!;
        const content = g.kickerH + 10 + g.titleH + g.listGap + n * g.rowH;
        expect(g.card.h - content).toBeCloseTo(g.pad * 2);
      }
  });
});

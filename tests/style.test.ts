import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACCENT, pal } from "../src/soft.tsx";

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

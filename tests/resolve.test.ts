import { describe, expect, it } from "vitest";
import { Edit } from "../src/schema.ts";
import { chunkWords, findPhrase, lintShots, resolveShots } from "../tools/resolve.ts";

const words = "If you're building software with AI, having a good code review tool is essential."
  .split(" ")
  .map((text, i) => ({ text, start: i * 0.3, end: i * 0.3 + 0.25 }));

const plan = (shots: unknown[]) =>
  Edit.parse({ title: "t", face: { x: 0.5, y: 0.2, h: 0.3 }, shots });

describe("findPhrase", () => {
  it("ignores case and punctuation", () => {
    expect(findPhrase(words, "with ai having")).toBe(4);
  });
  it("searches from an index", () => {
    expect(findPhrase(words, "If", 1)).toBe(-1);
  });
});

describe("resolveShots", () => {
  it("starts the first shot at zero and chains the rest", () => {
    const { shots, issues } = resolveShots(
      plan([
        { at: "If you're", layout: "split", visual: { kind: "title", text: "Hi" } },
        { at: "having a good", layout: "full" },
      ]),
      words,
      5,
    );
    expect(issues).toEqual([]);
    expect(shots[0].start).toBe(0);
    expect(shots[0].end).toBeCloseTo(Math.round((6 * 0.3 - 0.05) * 30) / 30);
    expect((shots[0].end * 30) % 1).toBeCloseTo(0);
    expect(shots[1].end).toBe(5);
  });

  it("reports anchors that are not spoken in order", () => {
    const { issues } = resolveShots(plan([{ at: "essential", layout: "full" }, { at: "building", layout: "full" }]), words, 5);
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });

  it("times reveals on their own words", () => {
    const { shots } = resolveShots(
      plan([{ at: "If", layout: "split", visual: { kind: "steps", items: [{ text: "a", at: "code" }, { text: "b", at: "essential" }] } }]),
      words,
      5,
    );
    expect(shots[0].visual?.times).toEqual([9 * 0.3 - 0.05, 13 * 0.3 - 0.05].map((x) => expect.closeTo(x)));
  });
});

describe("chunkWords", () => {
  it("keeps chunks to three words and isolates accents", () => {
    const chunks = chunkWords(words, ["essential"], [], 30);
    expect(Math.max(...chunks.map((c) => c.words.length))).toBeLessThanOrEqual(3);
    const last = chunks[chunks.length - 1];
    expect(last.words.map((w) => w.text)).toEqual(["essential."]);
    expect(last.words[0].accent).toBe(true);
  });

  it("never starts a chunk in the frames before a cut", () => {
    const cut = 9 * 0.3 - 0.05;
    const chunks = chunkWords(words, [], [cut], 30);
    for (const c of chunks) expect(c.start < cut && c.end > cut).toBe(false);
  });
});

describe("lintShots", () => {
  const img = { kind: "image" as const, src: "a.png", frame: "card" as const, highlight: [] };
  const shot = (start: number, end: number, layout: "split" | "full" | "punch" | "media" | "cutaway", visual?: typeof img) =>
    ({ start, end, layout, anchor: `${start}`, visual });

  it("mixed: flags long holds, a split without a visual and three in a row", () => {
    const issues = lintShots([shot(0, 4, "split"), shot(4, 5, "full"), shot(5, 6, "full"), shot(6, 7, "full")], 7, "mixed");
    const text = issues.map((i) => i.message).join("\n");
    expect(issues.some((i) => i.level === "error" && /no visual/.test(i.message))).toBe(true);
    expect(text).toMatch(/holds 4.0s/);
    expect(text).toMatch(/third full shot in a row/);
  });

  it("react: allows longer split holds and runs of splits", () => {
    const issues = lintShots([shot(0, 4, "split", img), shot(4, 7, "split", img), shot(7, 8, "punch"), shot(8, 10, "split", img)], 10, "react");
    expect(issues).toEqual([]);
  });

  it("react: warns when the speaker leaves or the source is missing", () => {
    const issues = lintShots([shot(0, 2, "split", img), shot(2, 4, "cutaway", img), shot(4, 5, "full"), shot(5, 6, "punch")], 6, "react");
    const text = issues.map((i) => i.message).join("\n");
    expect(text).toMatch(/hides the speaker/);
    expect(text).toMatch(/two face-only shots in a row/);
    expect(text).toMatch(/split is 33%/);
  });
});

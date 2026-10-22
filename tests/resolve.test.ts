import { describe, expect, it } from "vitest";
import { Edit } from "../src/schema.ts";
import { isKeyword } from "../src/Captions.tsx";
import { chunkWords, estimateWords, findPhrase, lintShots, resolveShots } from "../tools/resolve.ts";

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

describe("scenes across shots", () => {
  const flow = { kind: "flow", nodes: [{ title: "A", at: "building" }, { title: "B", at: "good" }], edges: [{ from: 0, to: 1, at: "review" }] };

  it("lands flow nodes and edges on their words", () => {
    const { shots, issues } = resolveShots(plan([{ at: "If", layout: "media", visual: flow }]), words, 5);
    expect(issues).toEqual([]);
    [2, 8, 10].forEach((w, k) => expect(shots[0].visual?.times?.[k]).toBeCloseTo(w * 0.3 - 0.05));
  });

  it("keeps the previous visual and its times", () => {
    const { shots, issues } = resolveShots(
      plan([
        { at: "If", layout: "media", visual: flow },
        { at: "having", layout: "media", keep: true, header: "Next" },
      ]),
      words,
      5,
    );
    expect(issues).toEqual([]);
    expect(shots[1].keep).toBe(true);
    expect(shots[1].visual).toBe(shots[0].visual);
    expect(shots[1].header).toBe("Next");
  });

  it("rejects keep across a layout change", () => {
    const { issues } = resolveShots(plan([{ at: "If", layout: "media", visual: flow }, { at: "having", layout: "split", keep: true }]), words, 5);
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });
});

describe("estimateWords", () => {
  it("paces a script near 165 words a minute, with pauses at full stops", () => {
    const script = Array.from({ length: 33 }, () => "Agents plan work.").join(" ");
    const est = estimateWords(script);
    expect(est).toHaveLength(99);
    const minutes = est[est.length - 1].end / 60;
    expect(99 / minutes).toBeGreaterThan(110);
    expect(99 / minutes).toBeLessThan(175);
    expect(est[3].start - est[2].end).toBeGreaterThan(est[2].start - est[1].end);
  });
});

describe("soft tech scenes", () => {
  it("lands typing, settle and chips on their words, and kept shots carry the tone", () => {
    const type = { kind: "type", text: "/analyze", at: "building", settle: "with", chips: [{ text: "link", at: "good" }] };
    const { shots, issues } = resolveShots(
      plan([{ at: "If", layout: "scene", tone: "dark", header: "A", visual: type }, { at: "having", layout: "scene", keep: true, header: "B" }]),
      words,
      5,
    );
    expect(issues).toEqual([]);
    expect(shots[0].visual?.times?.map((x) => +x.toFixed(2))).toEqual([0.55, 1.15, 2.35]);
    expect(shots[1].tone).toBe("dark");
  });

  it("film: counts reveals as beats and wants scenes to alternate tone", () => {
    const grid = { kind: "grid" as const, items: ["a.jpg", "b.jpg"], cols: 2, groups: [], times: [2] };
    const scene = (start: number, end: number, tone: "light" | "dark") => ({ start, end, layout: "scene" as const, anchor: `${start}`, header: "H", tone, visual: grid });
    const ok = lintShots([scene(0, 4, "dark"), scene(4, 7, "light")], 7, "film");
    expect(ok).toEqual([]);
    const text = lintShots([scene(0, 3, "dark"), scene(3, 8, "dark")], 8, "film").map((i) => i.message).join("\n");
    expect(text).toMatch(/two dark scenes in a row/);
    expect(text).toMatch(/nothing new on screen for 5.0s/);
  });
});

describe("camera and shared elements", () => {
  it("warns on a rushed capture move and on an entrance with no scene before it", () => {
    const img = { kind: "image" as const, src: "a.png", frame: "card" as const, highlight: [], from: [0, 0, 1, 1] as [number, number, number, number], to: [0.2, 0.2, 0.5, 0.5] as [number, number, number, number] };
    const text = lintShots(
      [
        { start: 0, end: 0.8, layout: "split", anchor: "a", visual: img },
        { start: 0.8, end: 3, layout: "full", anchor: "b" },
        { start: 3, end: 5, layout: "scene", anchor: "c", header: "H", visual: img, enter: { from: "tile", index: 0 } },
      ],
      5,
      "film",
    ).map((i) => i.message).join("\n");
    expect(text).toMatch(/camera move lasts 0.80s/);
    expect(text).toMatch(/needs a scene before it/);
  });
});

describe("youtube canvas", () => {
  const wide = (shots: unknown[]) => Edit.parse({ title: "t", canvas: "youtube", shots });

  it("defaults to the reel canvas", () => {
    expect(Edit.parse({ title: "t", shots: [{ at: "If", layout: "full" }] }).canvas).toBe("reel");
  });

  it("allows side and over, and rejects reel layouts", () => {
    const ok = resolveShots(
      wide([
        { at: "If", layout: "full" },
        { at: "building", layout: "over", visual: { kind: "lower", title: "Owain Lewis" } },
        { at: "having", layout: "side", visual: { kind: "title", text: "Code *review*" } },
      ]),
      words,
      5,
    );
    expect(lintShots(ok.shots, 5, "react", "youtube").filter((i) => i.level === "error")).toEqual([]);
    const bad = resolveShots(wide([{ at: "If", layout: "split", visual: { kind: "title", text: "x" } }]), words, 5);
    expect(lintShots(bad.shots, 5, "react", "youtube").some((i) => i.level === "error")).toBe(true);
  });

  it("rejects youtube layouts on a reel", () => {
    const { shots } = resolveShots(plan([{ at: "If", layout: "side", visual: { kind: "title", text: "x" } }]), words, 5);
    expect(lintShots(shots, 5).some((i) => i.level === "error" && i.message.includes("youtube"))).toBe(true);
  });

  it("warns when graphics are dense", () => {
    const shots = Array.from({ length: 12 }, (_, i) => ({ start: i * 10, end: i * 10 + 10, layout: "side", anchor: `a${i}`, visual: { kind: "title", text: "x" } })) as never;
    expect(lintShots(shots, 120, "react", "youtube").some((i) => i.message.includes("sparse"))).toBe(true);
  });
});

describe("chart and pipeline", () => {
  it("lands chart points and pipeline stages on their words", () => {
    const { shots, issues } = resolveShots(
      plan([
        { at: "If", layout: "split", visual: { kind: "chart", source: "Illustration", points: [{ label: "a", value: 1, at: "building" }, { label: "b", value: 2, at: "good" }] } },
        { at: "code", layout: "split", visual: { kind: "pipeline", stages: [{ label: "x", at: "review" }, {}] } },
      ]),
      words,
      5,
    );
    expect(issues).toEqual([]);
    expect(shots[0].visual?.times?.[1]).toBeCloseTo(8 * 0.3 - 0.05);
    expect(shots[1].visual?.times?.[0]).toBeCloseTo(10 * 0.3 - 0.05);
  });
});

describe("keyword captions", () => {
  it("skip filler words and keep content words", () => {
    expect(["the", "a", "is", "of", "and", "It's"].some(isKeyword)).toBe(false);
    expect(["factory", "massive", "30,000", "Claude", "agents."].every(isKeyword)).toBe(true);
  });
});

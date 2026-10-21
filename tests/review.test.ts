import { describe, expect, it } from "vitest";
import { emptyReview, formatFeedback, mergeReview, reelHash, shotIds, shotInfo, type Review } from "../review/model.ts";
import type { Resolved, ResolvedShot } from "../src/schema.ts";

const shot = (anchor: string, start: number, end: number, extra: Partial<ResolvedShot> = {}): ResolvedShot => ({ anchor, start, end, layout: "split", ...extra });

const reel = (shots: ResolvedShot[]): Resolved => ({
  slug: "demo",
  title: "Demo",
  duration: shots[shots.length - 1].end,
  fps: 30,
  video: "",
  videoSize: [1080, 1920],
  audio: null,
  face: { x: 0.5, y: 0.3, h: 0.17 },
  grade: { brightness: 1, contrast: 1, saturate: 1 },
  split: "half",
  shots,
  chunks: [
    { start: 0, end: 1, words: [{ text: "Most", start: 0.1, end: 0.3, accent: false }, { text: "people", start: 0.3, end: 0.6, accent: false }] },
    { start: 1, end: 2, words: [{ text: "That", start: 1.1, end: 1.3, accent: false }] },
    { start: 2, end: 3, words: [{ text: "Here", start: 2.1, end: 2.3, accent: false }] },
  ],
  sfx: [],
});

const base = [
  shot("Most people", 0, 1, { visual: { kind: "title", text: "One *agent*" } }),
  shot("That is", 1, 2, { layout: "punch" }),
  shot("Here is", 2, 3, { visual: { kind: "stat", value: "2", label: "agents" } }),
];

// Owain approves shot 1, asks for a change on shot 2, leaves shot 3.
const reviewed = (): Review => {
  const r = reel(base);
  const { review } = mergeReview(emptyReview(), shotInfo(r), reelHash(r), "t0");
  const [a, b] = shotInfo(r);
  review.shots[a.id] = { ...review.shots[a.id], status: "approved" };
  review.shots[b.id] = { ...review.shots[b.id], status: "change", comment: "Make it a split with the list" };
  review.notes = { text: "Music too loud", hash: reelHash(r), at: "t0" };
  return review;
};

describe("shot ids", () => {
  it("come from the anchor and stay unique", () => {
    expect(shotIds([shot("Here is the setup", 0, 1), shot("Part one!", 1, 2), shot("Here is the setup", 2, 3)])).toEqual([
      "here-is-the-setup",
      "part-one",
      "here-is-the-setup-2",
    ]);
  });
});

describe("mergeReview", () => {
  it("starts every shot waiting", () => {
    const r = reel(base);
    const { review, added } = mergeReview(emptyReview(), shotInfo(r), reelHash(r), "t0");
    expect(added).toEqual(["most-people", "that-is", "here-is"]);
    expect(Object.values(review.shots).map((s) => s.status)).toEqual(["waiting", "waiting", "waiting"]);
  });

  it("keeps reviews when nothing changed", () => {
    const r = reel(base);
    const { review, changed } = mergeReview(reviewed(), shotInfo(r), reelHash(r), "t1");
    expect(changed).toEqual([]);
    expect(review.shots["most-people"].status).toBe("approved");
    expect(review.shots["that-is"].comment).toBe("Make it a split with the list");
    expect(review.notes.text).toBe("Music too loud");
  });

  it("sends a changed shot back to waiting and keeps the old note as history", () => {
    const next = [base[0], shot("That is", 1, 2, { layout: "split", visual: { kind: "list", items: [{ text: "a" }, { text: "b" }], preview: false } }), base[2]];
    const r = reel(next);
    const { review, changed } = mergeReview(reviewed(), shotInfo(r), reelHash(r), "t1");
    expect(changed).toEqual(["that-is"]);
    expect(review.shots["that-is"]).toMatchObject({ status: "waiting", comment: "", at: "t1" });
    expect(review.shots["that-is"].history).toEqual([{ hash: expect.any(String), status: "change", comment: "Make it a split with the list", at: "t0" }]);
    // Untouched shots keep their review.
    expect(review.shots["most-people"].status).toBe("approved");
    // The reel changed, so the whole-reel notes become history.
    expect(review.notes.text).toBe("");
    expect(review.notesHistory.map((n) => n.text)).toEqual(["Music too loud"]);
  });

  it("treats a new length as a change", () => {
    const r = reel([base[0], shot("That is", 1, 1.5, { layout: "punch" }), shot("Here is", 1.5, 3, { visual: base[2].visual })]);
    expect(mergeReview(reviewed(), shotInfo(r), reelHash(r)).changed).toEqual(["that-is", "here-is"]);
  });

  it("sets a removed shot aside and restores it if it comes back unchanged", () => {
    const without = reel([base[0], shot("Here is", 1, 3, { visual: base[2].visual })]);
    const first = mergeReview(reviewed(), shotInfo(without), reelHash(without), "t1");
    expect(first.removed).toEqual(["that-is"]);
    expect(first.review.shots["that-is"]).toBeUndefined();
    expect(first.review.removed["that-is"].comment).toBe("Make it a split with the list");

    const back = reel(base);
    const second = mergeReview(first.review, shotInfo(back), reelHash(back), "t2");
    expect(second.review.shots["that-is"]).toMatchObject({ status: "change", comment: "Make it a split with the list" });
    expect(second.review.removed).toEqual({});
  });

  it("adds a new shot as waiting", () => {
    const r = reel([...base.slice(0, 2), shot("Here is", 2, 2.5, { visual: base[2].visual }), shot("Try it", 2.5, 3, { layout: "punch" })]);
    const { review, added } = mergeReview(reviewed(), shotInfo(r), reelHash(r));
    expect(added).toEqual(["try-it"]);
    expect(review.shots["try-it"]).toMatchObject({ status: "waiting", history: [] });
    expect(review.shots["that-is"].status).toBe("change");
  });
});

describe("formatFeedback", () => {
  it("lists only open changes and the whole-reel notes", () => {
    const r = reel(base);
    const out = formatFeedback("demo", reviewed(), shotInfo(r));
    expect(out).toContain("1 approved, 1 to change, 1 waiting");
    expect(out).toContain("Music too loud");
    expect(out).toContain('#2 that-is  1.0s +1.0s  punch  at "That is"');
    expect(out).toContain("> Make it a split with the list");
    expect(out).not.toContain("#1 ");
  });
});

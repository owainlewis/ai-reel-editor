// Turn an edit plan plus a word-timed transcript into exact times.
// Pure functions, so they are easy to test.
import type { Chunk, EditPlan, ResolvedShot, SfxEvent, Word } from "../src/schema.ts";

export const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, "");

const tokens = (phrase: string) => phrase.split(/\s+/).map(norm).filter(Boolean);

// Index of the first word of `phrase` at or after `from`, or -1.
export const findPhrase = (words: Word[], phrase: string, from = 0): number => {
  const want = tokens(phrase);
  if (!want.length) return -1;
  for (let i = from; i <= words.length - want.length; i++) {
    if (want.every((w, j) => norm(words[i + j].text) === w)) return i;
  }
  return -1;
};

// Cuts land slightly before the word so the new shot is up as the word starts.
export const CUT_LEAD = 0.05;

export type Issue = { level: "error" | "warn"; message: string };

// Shot boundaries sit exactly on frames, so the layout and its visual always switch on the same frame.
const snap = (t: number, fps: number) => Math.round(t * fps) / fps;

export const resolveShots = (plan: EditPlan, words: Word[], duration: number, fps = 30) => {
  const issues: Issue[] = [];
  const shots: (ResolvedShot & { index: number })[] = [];
  let cursor = 0;
  for (const s of plan.shots) {
    const i = findPhrase(words, s.at, cursor);
    if (i < 0) {
      issues.push({ level: "error", message: `shot anchor not found after word ${cursor}: "${s.at}"` });
      continue;
    }
    cursor = i + 1;
    const start = shots.length === 0 ? 0 : snap(Math.max(0, words[i].start - CUT_LEAD), fps);
    shots.push({ start, end: duration, layout: s.layout, visual: s.visual, sfx: s.sfx, anchor: s.at, index: i });
  }
  for (let k = 0; k < shots.length - 1; k++) shots[k].end = shots[k + 1].start;

  // Reveals inside a visual land on their own spoken words, searched from the shot's anchor.
  for (let k = 0; k < shots.length; k++) {
    const shot = shots[k];
    const v = shot.visual;
    if (!v) continue;
    const anchors: (string | undefined)[] =
      v.kind === "list" || v.kind === "steps" || v.kind === "terminal"
        ? (v.kind === "terminal" ? v.lines : v.items).map((it) => it.at)
        : v.kind === "logos"
          ? v.items.map((it) => it.at)
          : v.kind === "image"
            ? v.highlight.map((h) => h.at)
            : v.kind === "compare"
              ? [v.right.at]
              : [];
    if (!anchors.length) continue;
    let from = shot.index;
    const times = anchors.map((a, n) => {
      // Unanchored items cascade in quickly so a group reads as one arrival.
      if (!a) return shot.start + n * 0.12;
      const j = findPhrase(words, a, from);
      if (j < 0) {
        issues.push({ level: "error", message: `reveal anchor not found in shot "${shot.anchor}": "${a}"` });
        return shot.start;
      }
      from = j + 1;
      return Math.max(shot.start, words[j].start - CUT_LEAD);
    });
    shot.visual = { ...v, times };
  }
  return { shots: shots.map(({ index, ...s }) => s), issues };
};

// Caption chunks: one to three words, broken at punctuation, pauses and cuts.
// Accent words stand alone so the serif reads as a deliberate beat.
export const chunkWords = (words: Word[], accents: string[], cuts: number[], fps: number): Chunk[] => {
  const accentSet = new Set(accents.flatMap(tokens));
  const isAccent = (w: Word) => accentSet.has(norm(w.text));
  const out: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({
      words: cur.map((w) => ({ ...w, accent: isAccent(w) })),
      start: cur[0].start,
      end: cur[cur.length - 1].end,
    });
    cur = [];
  };
  words.forEach((w, i) => {
    const next = words[i + 1];
    if (isAccent(w)) flush();
    cur.push(w);
    const crossesCut = next ? cuts.some((c) => c > w.end - 0.02 && c <= next.start + 0.02) : false;
    if (
      !next ||
      isAccent(w) ||
      isAccent(next) ||
      cur.length >= 3 ||
      /[.,!?;:]$/.test(w.text) ||
      next.start - w.end > 0.25 ||
      crossesCut
    )
      flush();
  });
  // Show each chunk two frames early and hold it until the next one when the gap is short.
  const lead = 2 / fps;
  out.forEach((c, i) => {
    c.start = Math.max(0, c.start - lead);
    const next = out[i + 1];
    c.end = next && next.words[0].start - lead - c.end < 0.6 ? next.words[0].start - lead : c.end + 0.15;
  });
  // A chunk that starts just before a cut starts on the cut instead, so it never
  // flashes for two frames in the previous shot's caption style.
  for (const cut of cuts) {
    out.forEach((c, i) => {
      if (c.start < cut && c.words[0].start >= cut - 0.15) {
        c.start = cut;
        if (out[i - 1] && out[i - 1].end > cut) out[i - 1].end = cut;
      }
    });
  }
  return out;
};

// Sound comes from the plan's cut sounds plus quiet taps on visible reveals.
export const sfxEvents = (shots: ResolvedShot[]): SfxEvent[] => {
  const ev: SfxEvent[] = [];
  for (const s of shots) {
    if (s.sfx) ev.push({ kind: s.sfx, t: s.start });
    const v = s.visual;
    if (!v?.times) continue;
    const kind = v.kind === "terminal" ? "key" : v.kind === "image" ? "blip" : "pop";
    v.times.forEach((t, n) => {
      if (n === 0 && Math.abs(t - s.start) < 0.05 && s.sfx) return;
      ev.push({ kind, t, gain: 0.45 });
    });
  }
  return ev.sort((a, b) => a.t - b.t);
};

// House rules from docs/STYLE.md that can be checked mechanically.
export const lintShots = (shots: ResolvedShot[], duration: number): Issue[] => {
  const issues: Issue[] = [];
  const speaker = (l: string) => l !== "media";
  let away = 0;
  shots.forEach((s, i) => {
    const len = s.end - s.start;
    const label = `shot ${i + 1} (${s.start.toFixed(2)}s "${s.anchor}")`;
    if (len > 3.2) issues.push({ level: "warn", message: `${label} holds ${len.toFixed(1)}s; keep shots under about 2.8s` });
    if (len < 0.4) issues.push({ level: "warn", message: `${label} is only ${len.toFixed(2)}s` });
    if ((s.layout === "split" || s.layout === "media") && !s.visual)
      issues.push({ level: "error", message: `${label} is ${s.layout} but has no visual` });
    away = speaker(s.layout) ? 0 : away + len;
    if (away > 3.5) issues.push({ level: "warn", message: `${label}: speaker off screen for ${away.toFixed(1)}s` });
    const prev = shots[i - 1];
    const prev2 = shots[i - 2];
    if (prev && prev2 && prev.layout === s.layout && prev2.layout === s.layout)
      issues.push({ level: "warn", message: `${label}: third ${s.layout} shot in a row` });
  });
  if (shots[0] && shots[0].layout !== "split")
    issues.push({ level: "warn", message: "first shot should be a split with the topic on top" });
  const last = shots[shots.length - 1];
  if (last && last.end < duration - 0.05) issues.push({ level: "error", message: "shots do not reach the end" });
  return issues;
};

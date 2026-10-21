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
  let header = plan.header;
  for (const s of plan.shots) {
    const i = findPhrase(words, s.at, cursor);
    if (i < 0) {
      issues.push({ level: "error", message: `shot anchor not found after word ${cursor}: "${s.at}"` });
      continue;
    }
    cursor = i + 1;
    const start = shots.length === 0 ? 0 : snap(Math.max(0, words[i].start - CUT_LEAD), fps);
    // The header carries forward until a shot sets a new one, or false to hide it.
    header = s.header === false ? undefined : (s.header ?? header);
    const prev = shots[shots.length - 1];
    if (s.keep && (!(prev?.visual || prev?.keep) || prev.layout !== s.layout || s.visual))
      issues.push({ level: "error", message: `"${s.at}" keeps the previous visual, so it needs the same layout as a previous shot with a visual and no visual of its own` });
    shots.push({ start, end: duration, layout: s.layout, visual: s.visual, sfx: s.sfx, anchor: s.at, index: i, header, ...(s.keep ? { keep: true } : {}) });
  }
  for (let k = 0; k < shots.length - 1; k++) shots[k].end = shots[k + 1].start;

  // Reveals inside a visual land on their own spoken words, searched from the shot's anchor.
  for (let k = 0; k < shots.length; k++) {
    const shot = shots[k];
    // A kept shot shows the same visual, already resolved from the shot that started it.
    if (shot.keep && k > 0) {
      shot.visual = shots[k - 1].visual;
      continue;
    }
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
              : v.kind === "prompt"
                ? [v.at]
                : v.kind === "flow"
                  ? [...v.nodes.map((n) => n.at), ...v.edges.map((e) => e.at)]
                  : [];
    if (!anchors.length) continue;
    let from = shot.index;
    // A flow's edges are searched from the shot's start again, so they can interleave with its nodes.
    const edgesFrom = v.kind === "flow" ? v.nodes.length : -1;
    const times = anchors.map((a, n) => {
      if (n === edgesFrom) from = shot.index;
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

// Word timings for a script with no recording, at a natural reading pace (about 165 words a
// minute), with pauses at commas and full stops. Good enough to pace and test the graphics.
export const estimateWords = (script: string, wpm = 165): Word[] => {
  const perWord = 60 / wpm;
  const out: Word[] = [];
  let t = 0.3;
  for (const text of script.split(/\s+/).filter(Boolean)) {
    // Longer words take longer to say; the average word stays near `perWord`.
    const len = perWord * (0.55 + 0.09 * Math.min(12, text.replace(/[^\p{L}\p{N}]/gu, "").length));
    out.push({ text, start: +t.toFixed(3), end: +(t + len * 0.9).toFixed(3) });
    t += len + (/[.!?]$/.test(text) ? 0.45 : /[,;:]$/.test(text) ? 0.2 : 0);
  }
  return out;
};

// Sound comes from the plan's cut sounds plus quiet taps on visible reveals.
export const sfxEvents = (shots: ResolvedShot[]): SfxEvent[] => {
  const ev: SfxEvent[] = [];
  for (const s of shots) {
    if (s.sfx) ev.push({ kind: s.sfx, t: s.start });
    if (s.keep) continue;
    const v = s.visual;
    if (!v?.times) continue;
    const kind = v.kind === "terminal" || v.kind === "prompt" ? "key" : v.kind === "image" ? "blip" : "pop";
    v.times.forEach((t, n) => {
      if (n === 0 && Math.abs(t - s.start) < 0.05 && s.sfx) return;
      ev.push({ kind, t, gain: 0.45 });
    });
  }
  return ev.sort((a, b) => a.t - b.t);
};

// House rules from docs/STYLE.md that can be checked mechanically. Each format has its own.
//   react: the speaker stays on screen in a split while the top panel walks through the source.
//   mixed: every layout, cut fast, the speaker can step away for b-roll and full visuals.
export type Format = "react" | "mixed";

export const lintShots = (shots: ResolvedShot[], duration: number, format: Format = "react"): Issue[] => {
  const issues: Issue[] = [];
  const speaker = (l: string) => l !== "media" && l !== "cutaway";
  const total = (pred: (s: ResolvedShot) => boolean) => shots.filter(pred).reduce((t, s) => t + s.end - s.start, 0);
  const maxHold = format === "react" ? 4.2 : 3.2;
  let away = 0;
  shots.forEach((s, i) => {
    const len = s.end - s.start;
    const label = `shot ${i + 1} (${s.start.toFixed(2)}s "${s.anchor}")`;
    if (len > maxHold) issues.push({ level: "warn", message: `${label} holds ${len.toFixed(1)}s; keep ${format} shots under ${(maxHold - 0.4).toFixed(1)}s` });
    if (len < 0.4) issues.push({ level: "warn", message: `${label} is only ${len.toFixed(2)}s` });
    if ((s.layout === "split" || s.layout === "media" || s.layout === "cutaway") && !s.visual)
      issues.push({ level: "error", message: `${label} is ${s.layout} but has no visual` });
    if (format === "react" && !speaker(s.layout))
      issues.push({ level: "warn", message: `${label}: ${s.layout} hides the speaker; react reels keep the face on screen (use split)` });
    away = speaker(s.layout) ? 0 : away + len;
    if (away > 3.5) issues.push({ level: "warn", message: `${label}: speaker off screen for ${away.toFixed(1)}s` });
    const prev = shots[i - 1];
    const prev2 = shots[i - 2];
    if (format === "mixed" && prev && prev2 && prev.layout === s.layout && prev2.layout === s.layout)
      issues.push({ level: "warn", message: `${label}: third ${s.layout} shot in a row` });
    if (format === "react" && prev && s.layout !== "split" && prev.layout !== "split")
      issues.push({ level: "warn", message: `${label}: two face-only shots in a row; react reels return to the split` });
  });
  if (shots[0] && shots[0].layout !== "split")
    issues.push({ level: "warn", message: "first shot should be a split with the topic on top" });
  if (format === "react" && duration > 0) {
    const split = total((s) => s.layout === "split") / duration;
    if (split < 0.6) issues.push({ level: "warn", message: `split is ${Math.round(split * 100)}% of the reel; react reels sit around 70 to 85%` });
    const sources = shots.filter((s) => s.visual?.kind === "image").length;
    if (sources < 2) issues.push({ level: "warn", message: `only ${sources} source captures; a react reel walks through the source (repo, README, post)` });
  }
  const last = shots[shots.length - 1];
  if (last && last.end < duration - 0.05) issues.push({ level: "error", message: "shots do not reach the end" });
  return issues;
};

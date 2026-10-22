// Turn an edit plan plus a word-timed transcript into exact times.
// Pure functions, so they are easy to test.
import type { Chunk, EditPlan, ResolvedShot, SfxEvent, VisualSpec, Word } from "../src/schema.ts";

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

// The spoken anchors inside a visual, in the order its parts reveal. `times` in the resolved plan
// follows this order, one time per anchor (an unanchored part cascades in after the shot starts).
export const visualAnchors = (v: VisualSpec): (string | undefined)[] => {
  switch (v.kind) {
    case "list":
    case "steps":
    case "agenda":
    case "levels":
    case "checklist":
    case "matrix":
    case "timeline":
    case "windows":
      return v.items.map((it) => it.at);
    case "terminal": return v.lines.map((it) => it.at);
    case "logos": return v.items.map((it) => it.at);
    case "image": return v.highlight.map((h) => h.at);
    case "compare": return [v.right.at];
    case "beforeafter": return [v.after.at];
    case "prompt":
    case "quote":
    case "logowall":
    case "ring":
    case "meter":
    case "waffle":
      return [v.at];
    case "chart": return v.points.map((pt) => pt.at);
    case "kpi": return v.items.map((it) => it.at);
    case "bento": return v.cells.map((c) => c.at);
    case "pipeline": return v.stages.map((st) => st.at);
    case "constraint": return [...v.stages.map((st) => st.at), v.at];
    case "flow": return [...v.nodes.map((n) => n.at), ...v.edges.map((e) => e.at)];
    case "grid": return [v.at, ...v.groups.map((g) => g.at)];
    case "funnel": return [...v.items.map((it) => it.at), v.at, ...v.target.lines.map((l) => l.at)];
    case "type": return [v.at, v.settle, ...v.chips.map((c) => c.at)];
    default: return [];
  }
};

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
    // A kept shot carries the tone of the scene it continues.
    const tone = s.keep && prev ? prev.tone : s.tone;
    shots.push({ start, end: duration, layout: s.layout, visual: s.visual, sfx: s.sfx, anchor: s.at, index: i, header, ...(s.keep ? { keep: true } : {}), ...(tone ? { tone } : {}), ...(s.enter ? { enter: s.enter } : {}) });
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
    const anchors = visualAnchors(v);
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
    const kind = v.kind === "terminal" || v.kind === "prompt" || v.kind === "type" ? "key" : v.kind === "image" ? "blip" : "pop";
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
//   film: full-frame scenes that build across shots; a reveal or a headline swap counts as a beat.
export type Format = "react" | "mixed" | "film";

// The longest stretch inside a shot with nothing new on screen: reveals inside its visual count.
const longestStill = (s: ResolvedShot) => {
  const beats = [s.start, ...(s.visual?.times ?? []).filter((x) => x > s.start && x < s.end), s.end].sort((a, b) => a - b);
  return Math.max(...beats.slice(1).map((b, i) => b - beats[i]));
};

// YouTube (16:9) over a hand-edited rough cut: sparse and calm. Graphics hold longer, the
// speaker is rarely away, and most of the video is the picture as cut.
export const lintWide = (shots: ResolvedShot[], duration: number): Issue[] => {
  const issues: Issue[] = [];
  let away = 0;
  shots.forEach((s, i) => {
    const len = s.end - s.start;
    const label = `shot ${i + 1} (${s.start.toFixed(2)}s "${s.anchor}")`;
    if (s.layout === "split" || s.layout === "scene") issues.push({ level: "error", message: `${label}: ${s.layout} is a reel layout; use side, media or over on YouTube` });
    if ((s.layout === "side" || s.layout === "media" || s.layout === "cutaway") && !s.visual) issues.push({ level: "error", message: `${label} is ${s.layout} but has no visual` });
    if (s.layout === "over" && s.visual?.kind !== "lower" && s.visual?.kind !== "title")
      issues.push({ level: "error", message: `${label}: over takes a lower third or a title` });
    if (s.layout === "over" && len < 2.5) issues.push({ level: "warn", message: `${label}: an overlay for ${len.toFixed(1)}s is too quick to read` });
    if (s.layout !== "full" && s.layout !== "punch" && !s.keep && len > 12) issues.push({ level: "warn", message: `${label} holds ${len.toFixed(1)}s; past 12s give it a reveal, a keep or return to the speaker` });
    away = s.layout === "media" || s.layout === "cutaway" ? away + len : 0;
    if (away > 8) issues.push({ level: "warn", message: `${label}: speaker off screen for ${away.toFixed(1)}s; use side to keep the face in a window` });
  });
  const graphics = shots.filter((s) => s.layout !== "full" && s.layout !== "punch" && !s.keep).length;
  if (duration > 60 && graphics / (duration / 60) > 4)
    issues.push({ level: "warn", message: `${graphics} graphics in ${(duration / 60).toFixed(1)} min; keep YouTube sparse, about one every 20 to 60 s` });
  const last = shots[shots.length - 1];
  if (last && last.end < duration - 0.05) issues.push({ level: "error", message: "shots do not reach the end" });
  return issues;
};

export const lintShots = (shots: ResolvedShot[], duration: number, format: Format = "react", canvas: "reel" | "youtube" = "reel"): Issue[] => {
  if (canvas === "youtube") return lintWide(shots, duration);
  const issues: Issue[] = [];
  for (const s of shots)
    if (s.layout === "side" || s.layout === "over") issues.push({ level: "error", message: `"${s.anchor}": ${s.layout} is a YouTube layout; set "canvas": "youtube"` });
  const speaker = (l: string) => l !== "media" && l !== "cutaway" && l !== "scene";
  const total = (pred: (s: ResolvedShot) => boolean) => shots.filter(pred).reduce((t, s) => t + s.end - s.start, 0);
  let away = 0;
  let lastScene: ResolvedShot | undefined;
  shots.forEach((s, i) => {
    const len = s.end - s.start;
    const label = `shot ${i + 1} (${s.start.toFixed(2)}s "${s.anchor}")`;
    // One camera move per shot, and never a rushed one: a capture's from-to move needs time.
    const v = s.visual;
    if (!s.keep && v?.kind === "image" && v.from && v.to && v.from.some((x, k) => Math.abs(x - v.to![k]) > 0.005)) {
      let end = i;
      while (shots[end + 1]?.keep) end++;
      const moveLen = shots[end].end - s.start - (s.enter ? 0.7 : 0);
      if (moveLen < 1.2) issues.push({ level: "warn", message: `${label}: the camera move lasts ${moveLen.toFixed(2)}s; under 1.2s it reads as a jolt. Lock the camera or give it time` });
    }
    if (format === "film") {
      const still = longestStill(s);
      if (still > 3.6) issues.push({ level: "warn", message: `${label}: nothing new on screen for ${still.toFixed(1)}s; add a reveal or a headline swap` });
      if (s.layout === "scene" && !s.keep) {
        if (lastScene && (lastScene.tone ?? "light") === (s.tone ?? "light"))
          issues.push({ level: "warn", message: `${label}: two ${s.tone ?? "light"} scenes in a row; alternate light and dark` });
        lastScene = s;
      }
      if (len < 0.4) issues.push({ level: "warn", message: `${label} is only ${len.toFixed(2)}s` });
      if (s.layout !== "full" && s.layout !== "punch" && !s.visual)
        issues.push({ level: "error", message: `${label} is ${s.layout} but has no visual` });
      if (s.enter && (s.layout !== "scene" || shots[i - 1]?.layout !== "scene"))
        issues.push({ level: "error", message: `${label}: a shared-element entrance needs a scene before it and a scene to grow into` });
      if (s.enter && s.enter.from !== "rect") {
        let h = i - 1;
        while (h > 0 && shots[h].keep) h--;
        const kind = shots[h]?.visual?.kind;
        const want = { tile: "grid", card: "funnel", input: "type" }[s.enter.from];
        if (kind !== want) issues.push({ level: "error", message: `${label}: enters from a ${s.enter.from}, but the scene before it is not a ${want}` });
      }
      if (s.layout === "scene" && s.header && !s.keep && s.header.replace(/\*/g, "").length > 26)
        issues.push({ level: "warn", message: `${label}: headline "${s.header}" is long for a scene; keep it under 26 characters` });
      return;
    }
    // Something changes every 2 to 3 s (Owain, 2026-10-22): a cut, a reveal on its word, a header
    // swap or a punch-in. A long shot is fine while its reveals keep landing.
    const still = longestStill(s);
    if (still > 3) issues.push({ level: "warn", message: `${label}: nothing changes for ${still.toFixed(1)}s; something should change every 2 to 3 s (a cut, a reveal, a header swap or a punch-in)` });
    if (len < 0.4) issues.push({ level: "warn", message: `${label} is only ${len.toFixed(2)}s` });
    if ((s.layout === "split" || s.layout === "media" || s.layout === "cutaway" || s.layout === "scene") && !s.visual)
      issues.push({ level: "error", message: `${label} is ${s.layout} but has no visual` });
    if (format === "react" && !speaker(s.layout))
      issues.push({ level: "warn", message: `${label}: ${s.layout} hides the speaker; react reels keep the face on screen (use split)` });
    away = speaker(s.layout) ? 0 : away + len;
    if (away > 3.5) issues.push({ level: "warn", message: `${label}: speaker off screen for ${away.toFixed(1)}s` });
    const prev = shots[i - 1];
    // A keep shot (a header swap over the same visual) continues its shot, so runs count shots that change the picture.
    const [prev1, prev2] = shots.slice(0, i).filter((x) => !x.keep).reverse();
    if (format === "mixed" && !s.keep && prev1 && prev2 && prev1.layout === s.layout && prev2.layout === s.layout)
      issues.push({ level: "warn", message: `${label}: third ${s.layout} shot in a row` });
    if (format === "react" && prev && s.layout !== "split" && prev.layout !== "split")
      issues.push({ level: "warn", message: `${label}: two face-only shots in a row; react reels return to the split` });
  });
  if (shots[0] && shots[0].layout !== "split" && !(format === "film" && shots[0].layout === "scene" && shots[0].header))
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

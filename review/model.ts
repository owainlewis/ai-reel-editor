// Review state for a reel: one entry per shot in projects/<slug>/review.json.
// Pure functions, shared by the board's server and `reel feedback`, so they are easy to test.
import type { Resolved, ResolvedShot } from "../src/schema.ts";

export type Status = "waiting" | "approved" | "change";
// A past review of a shot, kept when the shot changes so the old note is never lost.
export type Past = { hash: string; status: Status; comment: string; at: string };
export type ShotReview = { hash: string; status: Status; comment: string; at: string; history: Past[] };
export type Review = {
  version: 1;
  // Whole-reel notes, tied to the reel as it was when they were written.
  notes: { text: string; hash: string; at: string };
  notesHistory: { text: string; hash: string; at: string }[];
  shots: Record<string, ShotReview>;
  // Reviews of shots that are no longer in the plan. A shot that comes back picks its review up again.
  removed: Record<string, ShotReview>;
};

// What the board and `feedback` show for each shot.
export type ShotInfo = {
  id: string;
  hash: string;
  n: number;
  start: number;
  end: number;
  layout: ResolvedShot["layout"];
  kind?: string;
  header?: string;
  keep?: boolean;
  anchor: string;
  words: string;
};

export const emptyReview = (): Review => ({ version: 1, notes: { text: "", hash: "", at: "" }, notesHistory: [], shots: {}, removed: {} });

// cyrb53: a small stable string hash, the same in Node and the browser.
export const hash = (s: string) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
};

// JSON with sorted keys, so the same plan always hashes the same.
export const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stable).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`
      : JSON.stringify(v);

const slugify = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "shot";

// A shot's id comes from its spoken anchor, which stays put while its look changes.
// A repeated anchor gets -2, -3.
export const shotIds = (shots: ResolvedShot[]) => {
  const seen = new Map<string, number>();
  return shots.map((s) => {
    const base = slugify(s.anchor);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
};

// Everything that changes what the shot looks like: its plan, its length in frames and its captions.
export const shotHash = (s: ResolvedShot, fps: number, words: string) =>
  hash(stable({ anchor: s.anchor, layout: s.layout, header: s.header, keep: s.keep, sfx: s.sfx, visual: s.visual, frames: Math.round((s.end - s.start) * fps), words }));

// The whole reel, for notes. The mixed audio file comes and goes with renders, so it is left out.
export const reelHash = (r: Resolved) => hash(stable({ ...r, audio: null }));

export const shotWords = (r: Resolved, s: ResolvedShot) =>
  r.chunks.flatMap((c) => c.words).filter((w) => w.start >= s.start && w.start < s.end).map((w) => w.text).join(" ");

export const shotInfo = (r: Resolved): ShotInfo[] => {
  const ids = shotIds(r.shots);
  return r.shots.map((s, i) => {
    const words = shotWords(r, s);
    return {
      id: ids[i],
      hash: shotHash(s, r.fps, words),
      n: i + 1,
      start: s.start,
      end: s.end,
      layout: s.layout,
      kind: s.visual?.kind,
      header: s.header,
      keep: s.keep,
      anchor: s.anchor,
      words,
    };
  });
};

// Bring a review up to date with the current plan.
// A shot whose hash changed goes back to "waiting", and its old status and comment move to history.
// New shots start waiting. Reviews of shots that left the plan move to `removed`.
export const mergeReview = (review: Review, shots: ShotInfo[], reel: string, now = new Date().toISOString()) => {
  const out: Review = { ...emptyReview(), ...review, shots: {}, removed: { ...review.removed } };
  const changed: string[] = [];
  const added: string[] = [];
  for (const s of shots) {
    const old = review.shots[s.id] ?? review.removed[s.id];
    delete out.removed[s.id];
    if (!old) {
      out.shots[s.id] = { hash: s.hash, status: "waiting", comment: "", at: now, history: [] };
      added.push(s.id);
    } else if (old.hash !== s.hash) {
      const past = old.status !== "waiting" || old.comment ? [{ hash: old.hash, status: old.status, comment: old.comment, at: old.at }] : [];
      out.shots[s.id] = { hash: s.hash, status: "waiting", comment: "", at: now, history: [...old.history, ...past] };
      changed.push(s.id);
    } else out.shots[s.id] = old;
  }
  const ids = new Set(shots.map((s) => s.id));
  const removed = Object.keys(review.shots).filter((id) => !ids.has(id));
  for (const id of removed) out.removed[id] = review.shots[id];
  // Notes are about the reel as it was. Once the reel changes they become history.
  if (out.notes.text && out.notes.hash !== reel) {
    out.notesHistory = [...out.notesHistory, out.notes];
    out.notes = { text: "", hash: reel, at: now };
  }
  return { review: out, changed, added, removed };
};

export const counts = (review: Review, shots: ShotInfo[]) => {
  const c = { approved: 0, change: 0, waiting: 0 };
  for (const s of shots) c[review.shots[s.id]?.status ?? "waiting"]++;
  return c;
};

const time = (t: number) => `${t.toFixed(1)}s`;

// The open changes, compact, for Claude to act on.
export const formatFeedback = (slug: string, review: Review, shots: ShotInfo[]) => {
  const c = counts(review, shots);
  const lines = [`${slug}: ${c.approved} approved, ${c.change} to change, ${c.waiting} waiting (of ${shots.length})`];
  if (review.notes.text) lines.push("", "Whole reel:", ...review.notes.text.trim().split("\n").map((l) => `  ${l}`));
  const open = shots.filter((s) => review.shots[s.id]?.status === "change");
  for (const s of open) {
    const r = review.shots[s.id];
    lines.push("", `#${s.n} ${s.id}  ${time(s.start)} +${time(s.end - s.start)}  ${s.layout}${s.kind ? ` ${s.kind}` : ""}${s.keep ? " (keep)" : ""}  at "${s.anchor}"`);
    if (s.words) lines.push(`  says: ${s.words}`);
    lines.push(...(r.comment.trim() || "(no comment)").split("\n").map((l) => `  > ${l}`));
    const last = r.history.filter((h) => h.status === "change" && h.comment).at(-1);
    if (last) lines.push(`  earlier note: ${last.comment.replace(/\s+/g, " ")}`);
  }
  if (!open.length && !review.notes.text) lines.push("", "No open changes.");
  return lines.join("\n");
};

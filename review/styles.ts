// Review state for the style lab: one entry per card in styles/<style>/review.json, like a reel's
// review.json. A card whose sample, slots or summary changed goes back to waiting, with its old
// note kept in history. Pure model plus a small store, shared by the server and `reel styles feedback`.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hash, stable, type Past, type Status } from "./model.ts";
import { blueprint, cards, type Card } from "../styles/blueprint/style.ts";

export type CardReview = { hash: string; status: Status; comment: string; at: string; history: Past[] };
export type StyleReview = { version: 1; style: string; notes: string; cards: Record<string, CardReview> };

// Everything that changes how a card looks or what it accepts.
export const cardHash = (c: Card) => hash(stable({ sample: c.sample, slots: c.slots, layouts: c.layouts, summary: c.summary }));

export const mergeStyleReview = (before: StyleReview | undefined, list: Card[], now = new Date().toISOString()): StyleReview => {
  const out: StyleReview = { version: 1, style: blueprint.id, notes: before?.notes ?? "", cards: {} };
  for (const c of list) {
    const h = cardHash(c);
    const old = before?.cards[c.id];
    if (!old) out.cards[c.id] = { hash: h, status: "waiting", comment: "", at: now, history: [] };
    else if (old.hash !== h) {
      const past = old.status !== "waiting" || old.comment ? [{ hash: old.hash, status: old.status, comment: old.comment, at: old.at }] : [];
      out.cards[c.id] = { hash: h, status: "waiting", comment: "", at: now, history: [...old.history, ...past] };
    } else out.cards[c.id] = old;
  }
  return out;
};

export const styleReviewFile = (dir: string) => join(dir, "review.json");

export const saveStyleReview = (dir: string, review: StyleReview) => {
  const tmp = styleReviewFile(dir) + ".tmp";
  writeFileSync(tmp, JSON.stringify(review, null, 2) + "\n");
  renameSync(tmp, styleReviewFile(dir));
};

export const loadStyleReview = (dir: string) => {
  const file = styleReviewFile(dir);
  const before = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as StyleReview) : undefined;
  const review = mergeStyleReview(before, cards);
  if (JSON.stringify(review) !== JSON.stringify(before)) saveStyleReview(dir, review);
  return { review, cards: cards.map((c) => ({ ...c, hash: cardHash(c) })) };
};

// The open notes, compact, for Claude to act on.
export const formatStyleFeedback = (review: StyleReview, list: Card[] = cards) => {
  const c = { approved: 0, change: 0, waiting: 0 };
  for (const card of list) c[review.cards[card.id]?.status ?? "waiting"]++;
  const lines = [`${review.style}: ${c.approved} approved, ${c.change} to change, ${c.waiting} waiting (of ${list.length} cards)`];
  if (review.notes.trim()) lines.push("", "Whole style:", ...review.notes.trim().split("\n").map((l) => `  ${l}`));
  const open = list.filter((card) => review.cards[card.id]?.status === "change");
  for (const card of open) {
    const r = review.cards[card.id];
    lines.push("", `${card.id}  (${card.kind}, ${card.tier})`, ...(r.comment.trim() || "(no comment)").split("\n").map((l) => `  > ${l}`));
    const last = r.history.filter((x) => x.status === "change" && x.comment).at(-1);
    if (last) lines.push(`  earlier note: ${last.comment.replace(/\s+/g, " ")}`);
  }
  if (!open.length && !review.notes.trim()) lines.push("", "No open changes.");
  return lines.join("\n");
};

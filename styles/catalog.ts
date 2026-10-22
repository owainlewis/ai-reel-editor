// What every style in styles/ shares: the shape of its tokens, its cards and their typed slots, and
// the helpers that check a plan against a card. A style is one folder (tokens.ts, style.ts,
// DESIGN.md, review.json) registered in styles/index.ts. See styles/README.md.
import type { VisualSpec } from "../src/schema";

// ---- Tokens ----

export type ToneTokens = {
  bg: string;
  card: string;
  chip: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  accent: string;
  accentText: string;
  shadow: string;
};

export type StyleTokens = {
  id: string;
  name: string;
  color: {
    light: ToneTokens;
    dark: ToneTokens;
    split: { line: string; shadow: string; highlight: string };
    terminal: string;
    onAccent: string;
  };
  font: { sans: string; serif: string; mono: string; sansWidth: number; monoWidth: number; minSize: number; labelMin: number };
  space: { panelX: number; seamGap: number; sceneX: number; headlineX: number; cardPad: number; cardPadSmall: number; gap: number; radius: number; radiusSmall: number };
  grid: {
    ink: { light: string; dark: string };
    cell: number;
    hair: { light: number; dark: number };
    rule: { light: number; dark: number };
    mark: { light: number; dark: number };
    tick: number;
    marginReel: number;
    marginScene: number;
    marginWide: number;
  };
  motion: { ease: readonly [number, number, number, number]; enter: number; settle: number; stagger: number; blur: number };
  // How a style treats the few things that change character between looks. Defaults: chunk
  // captions, a glow chapter card, a framed chart.
  look?: { captions?: "chunk" | "keyword"; chapter?: "glow" | "stack"; chart?: "framed" | "bare" };
};

// ---- Cards ----

// t1: a full-frame scene takeover. t2: beside the speaker (the split panel, or `side` on 16:9).
// overlay: over the speaker's picture.
export type Tier = "t1" | "t2" | "overlay";
export type SlotType = "text" | "richtext" | "number" | "image" | "anchor" | "enum" | "list";
// `name` is a path into the visual: `items[].text` is every item's text. Limits are typed, not
// comments: `maxChars` is the longest value (asterisks for the accent do not count), and a list
// slot takes `minItems` to `maxItems` entries. The card's layout is sized and tested for them.
export type Slot = { name: string; type: SlotType; maxChars?: number; minItems?: number; maxItems?: number; optional?: boolean; note?: string };
export type Layout = "split" | "scene" | "media" | "side" | "over" | "cutaway";
export type Card = {
  // <style>.<tier>.<purpose or kind>[.<treatment>], e.g. blueprint.t2.kpi or blueprint.t2.chart.line.
  id: string;
  kind: VisualSpec["kind"];
  tier: Tier;
  purpose: string;
  treatment?: string;
  summary: string;
  layouts: Layout[];
  slots: Slot[];
  // How long the card wants on screen, in seconds, from its first part landing.
  duration?: { min: number; max: number };
  // New in this style's catalog (not one of the editor's first visuals).
  added?: boolean;
  // Sample content for the style lab: the visual, a docked header for split, a scene headline.
  sample?: { visual: VisualSpec & { size?: [number, number] }; header: string; scene: string };
  // Why there is no sample, when the card needs a real asset to show anything honest.
  noSample?: string;
};

export type StyleDef = {
  id: string;
  name: string;
  number: string;
  status: "draft" | "active";
  summary: string;
  inspiration: string;
  palette: { light: ToneTokens; dark: ToneTokens; accent: string };
  fonts: { display: string; accent: string; mono: string; notes: string };
  motion: string;
  spacing: StyleTokens["space"];
  cards: Card[];
};

// Every value at a slot path: "items[].text" gives every item's text.
export const slotValues = (v: unknown, path: string): unknown[] => {
  let vals: unknown[] = [v];
  for (const part of path.split(".")) {
    const list = part.endsWith("[]");
    const key = list ? part.slice(0, -2) : part;
    vals = vals.flatMap((x) => {
      const y = x && typeof x === "object" ? (x as Record<string, unknown>)[key] : undefined;
      if (y === undefined) return [];
      return list && Array.isArray(y) ? y : [y];
    });
  }
  return vals;
};
const len = (x: unknown) => String(x).replace(/\*/g, "").length;

// The card a visual uses in a catalog (a chart picks its treatment by type).
export const cardFor = (cards: Card[], v: VisualSpec) => {
  const all = cards.filter((c) => c.kind === v.kind);
  return all.find((c) => v.kind !== "chart" || c.treatment === (v as { type?: string }).type) ?? all[0];
};

// Slots past their limits, for `validate`.
export const slotIssuesIn = (cards: Card[], v: VisualSpec): string[] => {
  const card = cardFor(cards, v);
  if (!card) return [];
  const out: string[] = [];
  for (const s of card.slots) {
    const vals = slotValues(v, s.name);
    if (s.maxChars !== undefined)
      for (const x of vals.flatMap((y) => (Array.isArray(y) ? y : [y])))
        if (typeof x === "string" && len(x) > s.maxChars) out.push(`${card.id} ${s.name} "${x}" is ${len(x)} characters; the card is sized for ${s.maxChars}`);
    if (s.type === "list" && vals.length === 1 && Array.isArray(vals[0])) {
      const n = (vals[0] as unknown[]).length;
      if ((s.minItems !== undefined && n < s.minItems) || (s.maxItems !== undefined && n > s.maxItems))
        out.push(`${card.id} ${s.name} has ${n}; the card takes ${s.minItems ?? 0} to ${s.maxItems ?? "any"}`);
    }
  }
  return out;
};

// The card's sample with every text slot filled to its maxChars with ordinary English words, and
// numbers to their full width, so previews and tests show the longest text the card accepts.
// Ordinary words, because a limit is a promise about real copy: a run of capital Ms is wider than
// any sentence and would only measure the font.
export const atMax = (card: Card): Card["sample"] => {
  if (!card.sample) return undefined;
  const v = structuredClone(card.sample.visual) as Record<string, unknown>;
  const words = "Every card holds the longest text it accepts with room to spare around it ";
  const fill = (n: number) => words.repeat(Math.ceil(n / words.length) + 1).slice(0, n).trimEnd().padEnd(n, "s");
  for (const s of card.slots) {
    if (s.maxChars === undefined || (s.type !== "text" && s.type !== "richtext" && s.type !== "number")) continue;
    // Captures and images keep their own content; only words are stretched.
    const parts = s.name.split(".");
    const walk = (x: unknown, i: number) => {
      if (!x || typeof x !== "object") return;
      const key = parts[i].replace("[]", "");
      const o = x as Record<string, unknown>;
      if (i === parts.length - 1) {
        if (Array.isArray(o[key])) o[key] = (o[key] as unknown[]).map(() => fill(s.maxChars!));
        else if (o[key] !== undefined) o[key] = s.type === "number" ? "9".repeat(s.maxChars!) : fill(s.maxChars!);
        return;
      }
      const next = o[key];
      if (Array.isArray(next)) next.forEach((y) => walk(y, i + 1));
      else walk(next, i + 1);
    };
    walk(v, 0);
  }
  return { ...card.sample, visual: v as never };
};

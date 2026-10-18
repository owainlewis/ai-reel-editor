// The edit plan. Claude Code writes `edit.json` in a project folder; `reel validate`
// resolves every spoken anchor to a time and writes `build/edit.resolved.json`,
// which is what the Remotion composition renders.
import { z } from "zod";

// A phrase the speaker says. Shots and reveals land on its first word.
// Each anchor must come after the previous shot's anchor in the transcript.
const Anchor = z.string().min(1);

// A rectangle in normalised image coordinates: [x, y, width, height], each 0 to 1.
const Rect = z.tuple([z.number(), z.number(), z.number(), z.number()]);

const Item = z.object({ text: z.string(), at: Anchor.optional() });

export const Visual = z.discriminatedUnion("kind", [
  // A real capture (web page, screenshot, photo). The camera moves from `from` to `to`.
  // `highlight` draws a marker over a region when `at` is spoken.
  z.object({
    kind: z.literal("image"),
    src: z.string(),
    from: Rect.optional(),
    to: Rect.optional(),
    frame: z.enum(["none", "browser", "card"]).default("card"),
    url: z.string().optional(),
    highlight: z.array(z.object({ rect: Rect, at: Anchor.optional() })).default([]),
  }),
  // B-roll footage. `start` is the offset into the clip in seconds.
  z.object({ kind: z.literal("video"), src: z.string(), start: z.number().default(0) }),
  // One or more official logos, never redrawn.
  z.object({
    kind: z.literal("logos"),
    items: z.array(z.object({ src: z.string(), name: z.string().optional(), at: Anchor.optional() })).min(1),
    caption: z.string().optional(),
  }),
  // A short headline. Wrap one word in *asterisks* for the Signifier italic accent.
  z.object({ kind: z.literal("title"), text: z.string(), kicker: z.string().optional() }),
  z.object({ kind: z.literal("list"), title: z.string().optional(), items: z.array(Item).min(2), active: z.number().optional() }),
  z.object({ kind: z.literal("steps"), title: z.string().optional(), items: z.array(Item).min(2) }),
  z.object({
    kind: z.literal("compare"),
    left: z.object({ label: z.string(), text: z.string() }),
    right: z.object({ label: z.string(), text: z.string(), at: Anchor.optional() }),
  }),
  z.object({ kind: z.literal("stat"), value: z.string(), label: z.string() }),
  // A terminal that types each line when it is spoken.
  z.object({ kind: z.literal("terminal"), title: z.string().optional(), lines: z.array(Item).min(1) }),
]);

export const Layout = z.enum([
  "full", // speaker fills the frame
  "punch", // tight on the speaker, for emphasis and the CTA
  "split", // visual on top, speaker below, caption on the seam
  "media", // visual fills the frame, voice continues
]);

export const SfxKind = z.enum(["whoosh", "pop", "impact", "thud", "blip", "chime", "key"]);

export const Shot = z.object({
  at: Anchor,
  layout: Layout,
  visual: Visual.optional(),
  // Sound on the cut into this shot. Most cuts should have none.
  sfx: SfxKind.optional(),
  note: z.string().optional(),
});

export const Edit = z.object({
  title: z.string(),
  // Where the speaker's face is in the source, as fractions of the frame:
  // centre x, centre y, and head height (crown to chin). Used to frame every speaker layout.
  face: z.object({ x: z.number(), y: z.number(), h: z.number() }),
  // Words to set in Signifier italic in the captions, matched case-insensitively.
  accents: z.array(z.string()).default([]),
  music: z.union([
    z.literal(false),
    z.object({ mood: z.enum(["focus", "uplift", "dark"]).default("focus"), track: z.string().optional(), level: z.number().default(-20) }),
  ]).default({ mood: "focus", level: -20 }),
  // A light colour grade on the speaker footage, as CSS filter amounts (1 = unchanged).
  grade: z.object({ brightness: z.number().default(1), contrast: z.number().default(1), saturate: z.number().default(1) }).default({ brightness: 1, contrast: 1, saturate: 1 }),
  // Gain for the speaker's own audio track, in dB.
  voiceGain: z.number().default(0),
  shots: z.array(Shot).min(1),
});

export type EditPlan = z.infer<typeof Edit>;
export type VisualSpec = z.infer<typeof Visual>;

export type Word = { text: string; start: number; end: number };

// Everything below is computed by `reel validate`.
export type ResolvedItem = { text: string; t: number };
export type ResolvedVisual = VisualSpec & { times?: number[]; size?: [number, number] };
export type ResolvedShot = {
  start: number;
  end: number;
  layout: z.infer<typeof Layout>;
  visual?: ResolvedVisual;
  sfx?: z.infer<typeof SfxKind>;
  anchor: string;
};
export type Chunk = { words: { text: string; start: number; end: number; accent: boolean }[]; start: number; end: number };
export type SfxEvent = { kind: z.infer<typeof SfxKind>; t: number; gain?: number };
export type Resolved = {
  slug: string;
  title: string;
  duration: number;
  fps: number;
  video: string;
  audio: string | null;
  face: { x: number; y: number; h: number };
  grade: { brightness: number; contrast: number; saturate: number };
  shots: ResolvedShot[];
  chunks: Chunk[];
  sfx: SfxEvent[];
};

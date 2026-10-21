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
    // A marker over a region, swept in on `at`. `label` adds a callout tag pointing at it.
    highlight: z.array(z.object({ rect: Rect, at: Anchor.optional(), label: z.string().optional() })).default([]),
  }),
  // B-roll footage: a project file, or "broll:<id>" for a clip from the library.
  // `start` is the offset into the clip in seconds.
  z.object({ kind: z.literal("video"), src: z.string(), start: z.number().default(0) }),
  // One or more official logos, never redrawn.
  z.object({
    kind: z.literal("logos"),
    items: z.array(z.object({ src: z.string(), name: z.string().optional(), at: Anchor.optional() })).min(1),
    caption: z.string().optional(),
  }),
  // A short headline. Wrap one word in *asterisks* for the Signifier italic accent.
  z.object({ kind: z.literal("title"), text: z.string(), kicker: z.string().optional() }),
  // `preview` shows every item dimmed from the start, an open loop the reel then closes item by item.
  // Repeat the same list in later shots to call back to it, with `active` on the current item.
  z.object({ kind: z.literal("list"), title: z.string().optional(), items: z.array(Item).min(2), active: z.number().optional(), preview: z.boolean().default(false) }),
  z.object({ kind: z.literal("steps"), title: z.string().optional(), items: z.array(Item).min(2) }),
  z.object({
    kind: z.literal("compare"),
    left: z.object({ label: z.string(), text: z.string() }),
    right: z.object({ label: z.string(), text: z.string(), at: Anchor.optional() }),
  }),
  z.object({ kind: z.literal("stat"), value: z.string(), label: z.string() }),
  // A chat input (e.g. Claude) where a prompt types itself out on `at`.
  z.object({ kind: z.literal("prompt"), app: z.string().default("Claude"), text: z.string(), at: Anchor.optional() }),
  // The end card: "Comment KEYWORD" and what they get. Only when there is a real resource to send.
  z.object({ kind: z.literal("cta"), keyword: z.string(), text: z.string(), src: z.string().optional() }),
  // A terminal that types each line when it is spoken.
  z.object({ kind: z.literal("terminal"), title: z.string().optional(), lines: z.array(Item).min(1) }),
  // A chapter card: a large number lands over a soft glow, the chapter's name tracked out below it.
  z.object({ kind: z.literal("chapter"), number: z.string(), label: z.string() }),
  // A diagram of how parts talk: cards joined by lines that draw on `at`. `chip` rides along an edge
  // (what is passed, e.g. "plan.md"). Two or three nodes sit in a row; with `root`, the first node
  // sits on top and the rest branch below it. A diagram, never a stand-in for real UI.
  z.object({
    kind: z.literal("flow"),
    root: z.boolean().default(false),
    nodes: z.array(z.object({ title: z.string(), kicker: z.string().optional(), lines: z.array(z.string()).default([]), at: Anchor.optional() })).min(2).max(4),
    edges: z.array(z.object({ from: z.number(), to: z.number(), chip: z.string().optional(), at: Anchor.optional() })).default([]),
  }),
  // A library that fills in: tiles arrive in a wave and `count` rolls up like an odometer on `at`.
  // `groups` light a set of tiles on their words, with the group's label swapping in above the grid.
  // `thumb` tiles are abstract moving thumbnails; `chip` tiles are blank pills (labels only on groups).
  // Schematic, never a stand-in for a real product's UI.
  z.object({
    kind: z.literal("grid"),
    count: z.string().optional(),
    label: z.string().optional(),
    tiles: z.number().int().min(2).max(60).default(24),
    cols: z.number().int().min(2).max(8).default(4),
    style: z.enum(["thumb", "chip"]).default("thumb"),
    at: Anchor.optional(),
    groups: z.array(z.object({ label: z.string(), tiles: z.array(z.number()), at: Anchor.optional() })).default([]),
  }),
  // Many sources flow into one result: link chips land, lines draw from each into the result card,
  // dots keep travelling down them, and the card's rows land on their words.
  z.object({
    kind: z.literal("funnel"),
    items: z.array(z.object({ text: z.string().optional(), at: Anchor.optional() })).min(1).max(12),
    at: Anchor.optional(),
    target: z.object({ title: z.string(), kicker: z.string().optional(), lines: z.array(Item).default([]) }),
  }),
  // Kinetic typing: `text` types itself huge across the frame on `at`, then on `settle` shrinks into
  // a small input, where `chips` (pasted links, files) pop in on their words. A neutral input, no brand UI.
  z.object({
    kind: z.literal("type"),
    text: z.string(),
    at: Anchor.optional(),
    settle: Anchor.optional(),
    label: z.string().optional(),
    chips: z.array(Item).default([]),
  }),
]);

export const Layout = z.enum([
  "full", // speaker fills the frame
  "punch", // tight on the speaker, for emphasis and the CTA
  "split", // visual on top, speaker below, caption on the seam
  "media", // visual fills the frame, voice continues
  "cutaway", // b-roll fills the whole frame edge to edge, voice continues
  "scene", // a full-frame graphic scene: big headline on top, the visual below, light or dark
]);

export const SfxKind = z.enum(["whoosh", "pop", "impact", "thud", "blip", "chime", "key"]);

export const Shot = z.object({
  at: Anchor,
  layout: Layout,
  visual: Visual.optional(),
  // Sound on the cut into this shot. Most cuts should have none.
  sfx: SfxKind.optional(),
  // Starts a new chapter header from this shot on (false hides it).
  header: z.union([z.string(), z.literal(false)]).optional(),
  // Keep the previous shot's visual on screen and running, so a scene builds across shots
  // while the header changes. Needs the same layout as the previous shot and no visual of its own.
  keep: z.boolean().optional(),
  // Scene colour: light (warm white) or dark (near-black with a soft accent glow). Alternate them
  // for rhythm. A kept shot carries the tone of the shot it keeps.
  tone: z.enum(["light", "dark"]).optional(),
  note: z.string().optional(),
});

export const Edit = z.object({
  title: z.string(),
  // react: the default for tool drops. The speaker stays on screen in a split while the
  //   top panel walks through the source, a highlight on each claim as it is said.
  // mixed: for how-it-works and setup reels. Every layout, b-roll cutaways, faster cuts.
  // film: soft tech product film. Full-frame scenes that build across shots, light and dark
  //   alternating, the speaker as punctuation. Something changes on screen at least every 3.6 s.
  format: z.enum(["react", "mixed", "film"]).default("react"),
  // half: speaker fills the bottom half. inset: the visual gets about 60% and the speaker sits in a rounded window.
  split: z.enum(["half", "inset"]).default("half"),
  // The reel's title. It lands large in frame 1 (the on-screen hook) and then docks as a small
  // header above the panel on every split and media shot. Wrap one word in *asterisks* for the accent.
  header: z.string().optional(),
  // Where the speaker's face is in the source footage, as fractions of its frame:
  // centre x, centre y, and head height (crown to chin). Used to frame every speaker layout.
  // Required for footage; script projects (no footage) use the placeholder's own.
  face: z.object({ x: z.number(), y: z.number(), h: z.number() }).optional(),
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
  header?: string;
  start: number;
  end: number;
  layout: z.infer<typeof Layout>;
  visual?: ResolvedVisual;
  sfx?: z.infer<typeof SfxKind>;
  anchor: string;
  keep?: boolean;
  tone?: "light" | "dark";
};
export type Chunk = { words: { text: string; start: number; end: number; accent: boolean }[]; start: number; end: number };
export type SfxEvent = { kind: z.infer<typeof SfxKind>; t: number; gain?: number };
export type Resolved = {
  slug: string;
  title: string;
  duration: number;
  fps: number;
  // Empty for script projects: the speaker is drawn as a placeholder.
  video: string;
  // Pixel size of the speaker footage: 1080x1920 portrait or 1920x1080 landscape.
  videoSize: [number, number];
  audio: string | null;
  face: { x: number; y: number; h: number };
  grade: { brightness: number; contrast: number; saturate: number };
  split: "half" | "inset";
  shots: ResolvedShot[];
  chunks: Chunk[];
  sfx: SfxEvent[];
};

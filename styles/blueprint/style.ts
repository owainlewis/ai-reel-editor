// The Blueprint card catalog: every visual kind the editor can put on screen, as a card with an
// id, a tier, a purpose, its slots (what the plan fills, and how long each may be) and sample
// content for the style lab. Modelled on herk-edit-kit's style library: named styles, tiered cards,
// declared slots. `npm run reel -- styles --write` writes style.json from this file.
//
// Tiers: t1 is a full-frame scene takeover, t2 sits in the split panel beside the speaker (or
// `side` on 16:9), overlay sits over the speaker's picture. Most cards work in both t1 and t2;
// `layouts` lists where. Pick the card for the line, fill its slots with real content, and keep
// every slot under its max: the card's layout is sized and tested for that length.
import type { VisualSpec } from "../../src/schema";
import { tokens } from "./tokens";
import { sampleLogo, samplePage, SAMPLE_PAGE_SIZE, sampleThumb } from "./samples";

export type Tier = "t1" | "t2" | "overlay";
export type SlotType = "text" | "richtext" | "number" | "image" | "anchor" | "enum" | "list";
// `name` is a path into the visual: `items[].text` is every item's text. `max` is the longest
// value in characters (asterisks for the accent do not count). `count` bounds a list's length.
export type Slot = { name: string; type: SlotType; max?: number; count?: [number, number]; optional?: boolean; note?: string };
export type Card = {
  id: string;
  kind: VisualSpec["kind"];
  tier: Tier;
  purpose: string;
  treatment?: string;
  summary: string;
  layouts: ("split" | "scene" | "media" | "side" | "over" | "cutaway")[];
  slots: Slot[];
  // New in the Blueprint catalog (not one of the editor's first visuals).
  added?: boolean;
  // Sample content for the style lab: the visual, a docked header for split, a scene headline.
  sample?: { visual: VisualSpec & { size?: [number, number] }; header: string; scene: string };
  // Why there is no sample, when the card needs a real asset to show anything honest.
  noSample?: string;
};

const T = (max = 32): Slot => ({ name: "title", type: "text", max, optional: true });
const at = (name: string): Slot => ({ name, type: "anchor", optional: true, note: "a spoken phrase; the part lands on its first word" });
const BOTH: Card["layouts"] = ["split", "scene", "side", "media"];

export const cards: Card[] = [
  // ---- t1: full-frame takeovers ----
  {
    id: "blueprint.t1.chapter",
    kind: "chapter",
    tier: "t1",
    purpose: "section",
    summary: "A chapter marker: a large number lands out of a blur, its name tracked out below.",
    layouts: ["scene", "media", "split"],
    slots: [{ name: "number", type: "text", max: 3 }, { name: "label", type: "text", max: 22 }],
    sample: { visual: { kind: "chapter", number: "02", label: "How it works" }, header: "Part *two*", scene: "Part *two*" },
  },
  {
    id: "blueprint.t1.title",
    kind: "title",
    tier: "t1",
    purpose: "thesis",
    summary: "The thesis in one line, word by word, with a rule drawing under it. One *accent* word.",
    layouts: ["scene", "split", "media", "over"],
    slots: [{ name: "text", type: "richtext", max: 40 }, { name: "kicker", type: "text", max: 24, optional: true }],
    sample: { visual: { kind: "title", text: "Show the *real* thing", kicker: "Sample title" }, header: "The *rule*", scene: "The *rule*" },
  },
  {
    id: "blueprint.t1.stat",
    kind: "stat",
    tier: "t1",
    purpose: "stat",
    summary: "One big number that counts up, a rule, and what it counts. Only a real, sourced number.",
    layouts: BOTH,
    slots: [{ name: "value", type: "number", max: 8 }, { name: "label", type: "richtext", max: 32 }],
    sample: { visual: { kind: "stat", value: "120", label: "Illustration: a *sample* count" }, header: "By the *numbers*", scene: "By the *numbers*" },
  },
  {
    id: "blueprint.t1.quote",
    kind: "quote",
    tier: "t1",
    purpose: "quote",
    added: true,
    summary: "A real quote in large serif, words resolving as it is read, with who said it and where.",
    layouts: BOTH,
    slots: [{ name: "text", type: "text", max: 140, note: "word for word from the source" }, { name: "source", type: "text", max: 48 }, at("at")],
    sample: {
      visual: { kind: "quote", text: "Show the real thing. If it is only a diagram, say so on the screen.", source: "Sample quote, illustration only" },
      header: "In their *words*",
      scene: "In their *words*",
    },
  },
  {
    id: "blueprint.t1.bento",
    kind: "bento",
    tier: "t1",
    purpose: "overview",
    added: true,
    summary: "A feature overview: one wide cell and smaller ones, each landing on its word.",
    layouts: BOTH,
    slots: [
      { name: "cells", type: "list", count: [3, 5], note: "four or fewer in a split" },
      { name: "cells[].title", type: "richtext", max: 20 },
      { name: "cells[].text", type: "text", max: 28, optional: true },
      { name: "cells[].value", type: "text", max: 7, optional: true },
      at("cells[].at"),
    ],
    sample: {
      visual: {
        kind: "bento",
        cells: [
          { title: "One *workspace*", text: "Sample: the headline feature", value: "01" },
          { title: "Plans", text: "Sample: a smaller cell" },
          { title: "Reviews", text: "Sample: a smaller cell" },
          { title: "Ships", text: "Sample: a smaller cell" },
        ],
      },
      header: "What you *get*",
      scene: "What you *get*",
    },
  },
  {
    id: "blueprint.t1.matrix",
    kind: "matrix",
    tier: "t1",
    purpose: "overview",
    treatment: "2x2",
    added: true,
    summary: "A 2x2: two axes draw from the centre and items land in their quadrants on their words.",
    layouts: BOTH,
    slots: [
      T(),
      { name: "x", type: "text", max: 14, count: [2, 2], note: "[low, high] along the bottom axis" },
      { name: "y", type: "text", max: 14, count: [2, 2], note: "[low, high] up the side" },
      { name: "items", type: "list", count: [1, 4] },
      { name: "items[].text", type: "richtext", max: 22 },
      { name: "items[].quad", type: "enum", note: "tl, tr, bl or br" },
      at("items[].at"),
    ],
    sample: {
      visual: {
        kind: "matrix",
        x: ["Slow", "Fast"],
        y: ["Simple", "Powerful"],
        items: [
          { text: "Sample A", quad: "bl" },
          { text: "Sample B", quad: "tl" },
          { text: "Sample C", quad: "br" },
          { text: "The *sweet* spot", quad: "tr" },
        ],
      },
      header: "Where it *fits*",
      scene: "Where it *fits*",
    },
  },
  {
    id: "blueprint.t1.logowall",
    kind: "logowall",
    tier: "t1",
    purpose: "overview",
    treatment: "logo-wall",
    added: true,
    summary: "Many official logos at once, in a wave, on white tiles. Never redrawn.",
    layouts: BOTH,
    slots: [
      { name: "items", type: "list", count: [4, 12] },
      { name: "items[].src", type: "image", note: "an official logo from the maker's site or press kit" },
      { name: "caption", type: "text", max: 40, optional: true },
      at("at"),
    ],
    sample: {
      visual: { kind: "logowall", items: "ABCDEF".split("").map((l, i) => ({ src: sampleLogo(l, i) })), caption: "Sample marks, not real logos" },
      header: "Works with *everything*",
      scene: "Works with *all*",
    },
  },
  {
    id: "blueprint.t1.grid",
    kind: "grid",
    tier: "t1",
    purpose: "overview",
    treatment: "library",
    summary: "A library that fills in: real thumbnails in a wave, an odometer count, groups that light.",
    layouts: ["scene", "split"],
    slots: [
      { name: "items", type: "list", count: [0, 12], note: "real thumbnails captured from the source" },
      { name: "count", type: "number", max: 6, optional: true },
      { name: "label", type: "text", max: 24, optional: true },
      { name: "groups[].label", type: "text", max: 16, optional: true },
      at("at"),
    ],
    sample: {
      visual: { kind: "grid", items: [1, 2, 3, 4, 5, 6].map(sampleThumb), count: "120", label: "Sample items", cols: 3, at: "count", groups: [] },
      header: "The *library*",
      scene: "The *library*",
    },
  },
  {
    id: "blueprint.t1.funnel",
    kind: "funnel",
    tier: "t1",
    purpose: "structure",
    treatment: "many-to-one",
    summary: "Many sources into one result: chips land, lines draw into the result card, its rows land.",
    layouts: ["scene", "split"],
    slots: [
      { name: "items", type: "list", count: [0, 9] },
      { name: "items[].text", type: "text", max: 16 },
      { name: "target.kicker", type: "text", max: 24, optional: true },
      { name: "target.title", type: "richtext", max: 22 },
      { name: "target.lines[].text", type: "richtext", max: 22, optional: true },
    ],
    sample: {
      visual: { kind: "funnel", items: [{ text: "Notes" }, { text: "Docs" }, { text: "Chats" }, { text: "Code" }], target: { kicker: "sample.md", title: "One *brief*", lines: [{ text: "Goal" }, { text: "Constraints" }] } },
      header: "Into *one*",
      scene: "Into *one*",
    },
  },
  {
    id: "blueprint.t1.type",
    kind: "type",
    tier: "t1",
    purpose: "thesis",
    treatment: "kinetic-typing",
    summary: "Kinetic typing: the line types itself huge, then settles into a plain input.",
    layouts: ["scene", "split"],
    slots: [{ name: "text", type: "text", max: 60 }, { name: "label", type: "text", max: 24, optional: true }, { name: "chips[].text", type: "text", max: 16, optional: true }, at("at"), at("settle")],
    sample: { visual: { kind: "type", text: "Make me a sample", at: "make", settle: "sample", label: "Sample input", chips: [] }, header: "Just *ask*", scene: "Just *ask*" },
  },
  {
    id: "blueprint.t1.cta",
    kind: "cta",
    tier: "t1",
    purpose: "cta",
    summary: "The end card: what to comment and what they get. Only when a real resource exists.",
    layouts: ["split", "media", "scene"],
    slots: [{ name: "keyword", type: "text", max: 12 }, { name: "text", type: "text", max: 40 }, { name: "src", type: "image", optional: true }],
    sample: { visual: { kind: "cta", keyword: "SAMPLE", text: "Illustration of an end card" }, header: "Get the *guide*", scene: "Get the *guide*" },
  },

  // ---- t2: beside the speaker ----
  {
    id: "blueprint.t2.capture",
    kind: "image",
    tier: "t2",
    purpose: "evidence",
    treatment: "capture",
    summary: "A real capture with one camera move and a highlight sweeping the words being said.",
    layouts: ["split", "media", "scene", "side"],
    slots: [
      { name: "src", type: "image", note: "a capture made with reel capture, never a mock-up" },
      { name: "url", type: "text", max: 60, optional: true },
      { name: "highlight[].label", type: "text", max: 24, optional: true },
      at("highlight[].at"),
    ],
    sample: {
      visual: { kind: "image", src: samplePage(), size: SAMPLE_PAGE_SIZE, frame: "card", from: [0.04, 0.12, 0.62, 0.62], to: [0.05, 0.5, 0.5, 0.28], highlight: [{ rect: [0.07, 0.565, 0.34, 0.06], label: "Sample callout" }] },
      header: "The *source*",
      scene: "The *source*",
    },
  },
  {
    id: "blueprint.t2.video",
    kind: "video",
    tier: "t2",
    purpose: "evidence",
    treatment: "clip",
    summary: "B-roll or a product's own clip, in a card, with one slow push-in.",
    layouts: ["split", "media", "cutaway", "scene", "side"],
    slots: [{ name: "src", type: "image", note: "a project clip or broll:<id>" }],
    noSample: "Needs a real clip; the lab shows no stand-in footage.",
  },
  {
    id: "blueprint.t2.logos",
    kind: "logos",
    tier: "t2",
    purpose: "label",
    treatment: "logos",
    summary: "One to four official logos on white tiles, each landing on its spoken name.",
    layouts: BOTH,
    slots: [{ name: "items", type: "list", count: [1, 4] }, { name: "items[].src", type: "image" }, { name: "items[].name", type: "text", max: 16, optional: true }, { name: "caption", type: "text", max: 32, optional: true }, at("items[].at")],
    sample: { visual: { kind: "logos", items: [{ src: sampleLogo("A", 0), name: "Sample A" }, { src: sampleLogo("B", 1), name: "Sample B" }] }, header: "The *tools*", scene: "The *tools*" },
  },
  {
    id: "blueprint.t2.list",
    kind: "list",
    tier: "t2",
    purpose: "list",
    summary: "Rows that arrive as each is said; the newest is active. `preview` shows all dim first.",
    layouts: BOTH,
    slots: [T(30), { name: "items", type: "list", count: [2, 5] }, { name: "items[].text", type: "richtext", max: 26 }, at("items[].at")],
    sample: { visual: { kind: "list", title: "Sample *list*", items: [{ text: "First point" }, { text: "Second point" }, { text: "Third point" }], preview: false }, header: "Three *ideas*", scene: "Three *ideas*" },
  },
  {
    id: "blueprint.t2.steps",
    kind: "steps",
    tier: "t2",
    purpose: "process",
    summary: "Numbered steps joined by a line that draws as each is spoken.",
    layouts: BOTH,
    slots: [T(24), { name: "items", type: "list", count: [2, 4] }, { name: "items[].text", type: "richtext", max: 20 }, at("items[].at")],
    sample: { visual: { kind: "steps", items: [{ text: "Install" }, { text: "Connect" }, { text: "Run it" }] }, header: "How to *start*", scene: "How to *start*" },
  },
  {
    id: "blueprint.t2.compare",
    kind: "compare",
    tier: "t2",
    purpose: "compare",
    treatment: "strike",
    summary: "Old way against new way; when the new one lands, the old is struck through.",
    layouts: BOTH,
    slots: [{ name: "left.label", type: "text", max: 14 }, { name: "left.text", type: "text", max: 32 }, { name: "right.label", type: "text", max: 14 }, { name: "right.text", type: "text", max: 32 }, at("right.at")],
    sample: { visual: { kind: "compare", left: { label: "Before", text: "Sample old way" }, right: { label: "After", text: "Sample new way" } }, header: "Old vs *new*", scene: "Old vs *new*" },
  },
  {
    id: "blueprint.t2.beforeafter",
    kind: "beforeafter",
    tier: "t2",
    purpose: "compare",
    treatment: "before-after",
    added: true,
    summary: "Two states of one thing, with an arrow; the after lands on its word and takes the accent.",
    layouts: BOTH,
    slots: [
      { name: "before.label", type: "text", max: 14 },
      { name: "before.value", type: "richtext", max: 12 },
      { name: "before.text", type: "text", max: 32, optional: true },
      { name: "after.label", type: "text", max: 14 },
      { name: "after.value", type: "richtext", max: 12 },
      { name: "after.text", type: "text", max: 32, optional: true },
      at("after.at"),
    ],
    sample: {
      visual: { kind: "beforeafter", before: { label: "Before", value: "By hand", text: "Sample: the old routine" }, after: { label: "After", value: "*Automatic*", text: "Sample: the new routine" } },
      header: "What *changes*",
      scene: "What *changes*",
    },
  },
  {
    id: "blueprint.t2.kpi",
    kind: "kpi",
    tier: "t2",
    purpose: "stat",
    treatment: "kpi-row",
    added: true,
    summary: "Two to four key numbers that count up on their words, with a source line.",
    layouts: BOTH,
    slots: [
      T(),
      { name: "items", type: "list", count: [2, 4] },
      { name: "items[].value", type: "number", max: 7 },
      { name: "items[].label", type: "text", max: 22 },
      { name: "source", type: "text", max: 60, note: "where the numbers come from, or Illustration" },
      at("items[].at"),
    ],
    sample: {
      visual: { kind: "kpi", items: [{ value: "12", label: "Sample metric" }, { value: "3.5x", label: "Sample ratio" }, { value: "2,400", label: "Sample count" }], source: "Illustration" },
      header: "The *results*",
      scene: "The *results*",
    },
  },
  {
    id: "blueprint.t2.chart.bar",
    kind: "chart",
    tier: "t2",
    purpose: "data",
    treatment: "bar",
    summary: "A bar chart; each bar grows on its word, the highlight takes the accent. Always a source.",
    layouts: BOTH,
    slots: [T(), { name: "points", type: "list", count: [2, 6] }, { name: "points[].label", type: "text", max: 8 }, { name: "unit", type: "text", max: 3, optional: true }, { name: "source", type: "text", max: 60 }, at("points[].at")],
    sample: {
      visual: { kind: "chart", type: "bar", title: "Sample series", points: [{ label: "A", value: 18 }, { label: "B", value: 31 }, { label: "C", value: 44 }, { label: "D", value: 72 }], source: "Illustration" },
      header: "It *grows*",
      scene: "It *grows*",
    },
  },
  {
    id: "blueprint.t2.chart.line",
    kind: "chart",
    tier: "t2",
    purpose: "data",
    treatment: "line",
    summary: "A line chart for change over time; the end value labelled big. Always a source.",
    layouts: BOTH,
    slots: [T(), { name: "points", type: "list", count: [2, 8] }, { name: "points[].label", type: "text", max: 6 }, { name: "points[].note", type: "text", max: 20, optional: true }, { name: "source", type: "text", max: 60 }, at("points[].at")],
    sample: {
      visual: { kind: "chart", type: "line", title: "Sample trend", points: [{ label: "Q1", value: 10 }, { label: "Q2", value: 16 }, { label: "Q3", value: 25 }, { label: "Q4", value: 41, note: "Sample note" }], source: "Illustration" },
      header: "Over *time*",
      scene: "Over *time*",
    },
  },
  {
    id: "blueprint.t2.pipeline",
    kind: "pipeline",
    tier: "t2",
    purpose: "process",
    summary: "Numbered stages on a track that light as named; unnamed stages wait as dim numbers.",
    layouts: BOTH,
    slots: [T(), { name: "stages", type: "list", count: [2, 8] }, { name: "stages[].label", type: "text", max: 14, optional: true }, at("stages[].at")],
    sample: { visual: { kind: "pipeline", stages: [{ label: "Plan" }, { label: "Build" }, { label: "Review" }, { label: "Ship" }] }, header: "The *process*", scene: "The *process*" },
  },
  {
    id: "blueprint.t2.timeline",
    kind: "timeline",
    tier: "t2",
    purpose: "process",
    treatment: "milestones",
    added: true,
    summary: "Dated milestones on a track that fills as each is named. Across for four, down for more.",
    layouts: BOTH,
    slots: [T(), { name: "items", type: "list", count: [2, 6] }, { name: "items[].date", type: "text", max: 8 }, { name: "items[].text", type: "richtext", max: 20 }, at("items[].at")],
    sample: {
      visual: { kind: "timeline", items: [{ date: "Step 1", text: "Sample start" }, { date: "Step 2", text: "Sample beta" }, { date: "Step 3", text: "Sample launch" }, { date: "Step 4", text: "*Today*" }] },
      header: "How we *got* here",
      scene: "How we *got* here",
    },
  },
  {
    id: "blueprint.t2.levels",
    kind: "levels",
    tier: "t2",
    purpose: "structure",
    treatment: "layers",
    added: true,
    summary: "A stack of layers built from the bottom up; each drops onto the stack on its word.",
    layouts: BOTH,
    slots: [T(), { name: "items", type: "list", count: [2, 5], note: "the first item is the foundation" }, { name: "items[].text", type: "richtext", max: 22 }, { name: "items[].note", type: "text", max: 8, optional: true }, at("items[].at")],
    sample: {
      visual: { kind: "levels", items: [{ text: "Sample base", note: "layer" }, { text: "Sample middle", note: "layer" }, { text: "Sample top", note: "layer" }, { text: "The *app*", note: "you" }] },
      header: "The *stack*",
      scene: "The *stack*",
    },
  },
  {
    id: "blueprint.t2.agenda",
    kind: "agenda",
    tier: "t2",
    purpose: "overview",
    treatment: "agenda",
    added: true,
    summary: "A table of contents shown dim up front, an open loop; each part lights on its word.",
    layouts: BOTH,
    slots: [T(), { name: "items", type: "list", count: [2, 5] }, { name: "items[].text", type: "richtext", max: 24 }, { name: "items[].note", type: "text", max: 6, optional: true }, { name: "active", type: "number", optional: true }, at("items[].at")],
    sample: {
      visual: { kind: "agenda", items: [{ text: "Sample setup", note: "0:10" }, { text: "Sample *workflow*", note: "0:25" }, { text: "Sample results", note: "0:40" }] },
      header: "In this *video*",
      scene: "Coming *up*",
    },
  },
  {
    id: "blueprint.t2.checklist",
    kind: "checklist",
    tier: "t2",
    purpose: "list",
    treatment: "checklist",
    added: true,
    summary: "Boxes that tick as each item is said.",
    layouts: BOTH,
    slots: [T(), { name: "items", type: "list", count: [2, 6] }, { name: "items[].text", type: "richtext", max: 26 }, at("items[].at")],
    sample: {
      visual: { kind: "checklist", items: [{ text: "Sample item one" }, { text: "Sample item two" }, { text: "Sample item three" }, { text: "Sample item four" }] },
      header: "Before you *ship*",
      scene: "Before you *ship*",
    },
  },
  {
    id: "blueprint.t2.flow",
    kind: "flow",
    tier: "t2",
    purpose: "structure",
    treatment: "diagram",
    summary: "How parts talk: cards joined by lines that draw, a chip riding along what is passed.",
    layouts: BOTH,
    slots: [
      { name: "nodes", type: "list", count: [2, 4] },
      { name: "nodes[].title", type: "richtext", max: 18 },
      { name: "nodes[].kicker", type: "text", max: 14, optional: true },
      { name: "nodes[].lines", type: "text", max: 24, optional: true },
      { name: "edges[].chip", type: "text", max: 14, optional: true },
      at("nodes[].at"),
    ],
    sample: {
      visual: { kind: "flow", root: false, nodes: [{ title: "Planner", kicker: "Sample", lines: [] }, { title: "*Builder*", kicker: "Sample", lines: [] }], edges: [{ from: 0, to: 1, chip: "plan.md" }] },
      header: "How it *works*",
      scene: "How it *works*",
    },
  },
  {
    id: "blueprint.t2.terminal",
    kind: "terminal",
    tier: "t2",
    purpose: "evidence",
    treatment: "terminal",
    summary: "A terminal that types each line on its spoken word. Real commands only.",
    layouts: ["split", "media", "side"],
    slots: [T(24), { name: "lines", type: "list", count: [1, 5] }, { name: "lines[].text", type: "text", max: 32, note: "start with > for output" }, at("lines[].at")],
    sample: { visual: { kind: "terminal", title: "sample", lines: [{ text: "npm run sample" }, { text: "> Illustration output" }] }, header: "Run *it*", scene: "Run *it*" },
  },
  {
    id: "blueprint.t2.prompt",
    kind: "prompt",
    tier: "t2",
    purpose: "evidence",
    treatment: "chat-input",
    summary: "A plain chat input where a prompt types itself out on its word.",
    layouts: ["split", "media", "side"],
    slots: [{ name: "app", type: "text", max: 16 }, { name: "text", type: "text", max: 120 }, at("at")],
    sample: { visual: { kind: "prompt", app: "Sample app", text: "Write a sample prompt that types itself out." }, header: "The *prompt*", scene: "The *prompt*" },
  },

  // ---- overlay: over the speaker's picture (16:9) ----
  {
    id: "blueprint.overlay.lower",
    kind: "lower",
    tier: "overlay",
    purpose: "lower-third",
    summary: "A lower third: a serif name or point, a sans line under it, a short rule. No box.",
    layouts: ["over"],
    slots: [{ name: "title", type: "richtext", max: 36 }, { name: "sub", type: "text", max: 56, optional: true }],
    sample: { visual: { kind: "lower", title: "Sample *name*", sub: "Sample role or point, illustration" }, header: "", scene: "" },
  },
];

export const blueprint = {
  id: tokens.id,
  name: tokens.name,
  number: "01",
  status: "draft",
  summary:
    "Cool paper and graphite with a quiet blueprint grid, white cards, cool ink and one clean blue. Split-first: graphics in the top half, the speaker on the bottom half. Calm, minimal, real content.",
  palette: { light: tokens.color.light, dark: tokens.color.dark, accent: tokens.color.light.accent },
  fonts: { display: "Helvetica Neue Bold", accent: "Signifier italic", mono: "SF Mono", notes: "Helvetica for structure, one Signifier italic word per line, mono for labels and numbers." },
  motion: "Expo-out entrances out of a light blur, staggered about 0.12 s. Things not yet said sit dim and soft, then sharpen on their word. One camera move per shot.",
  spacing: tokens.space,
  cards,
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

// The cards for a visual kind (a chart has two treatments).
export const cardsFor = (kind: string) => cards.filter((c) => c.kind === kind);

// Slots over their max, for `validate`: the card's layout is only sized and tested up to it.
export const slotIssues = (v: VisualSpec): string[] => {
  const card = cardsFor(v.kind).find((c) => !c.treatment || v.kind !== "chart" || c.treatment === (v as { type?: string }).type) ?? cardsFor(v.kind)[0];
  if (!card) return [];
  const out: string[] = [];
  for (const s of card.slots) {
    const vals = slotValues(v, s.name);
    if (s.max !== undefined)
      for (const x of vals.flatMap((y) => (Array.isArray(y) ? y : [y])))
        if (typeof x === "string" && len(x) > s.max) out.push(`${card.id} ${s.name} "${x}" is ${len(x)} characters; the card is sized for ${s.max}`);
    if (s.count && s.type === "list" && vals.length === 1 && Array.isArray(vals[0])) {
      const n = (vals[0] as unknown[]).length;
      if (n < s.count[0] || n > s.count[1]) out.push(`${card.id} ${s.name} has ${n}; the card takes ${s.count[0]} to ${s.count[1]}`);
    }
  }
  return out;
};

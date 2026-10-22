import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Visual } from "../src/schema.ts";
import { cardGeom, type Geom } from "../src/cards.tsx";
import { style } from "../src/style.ts";
import { blueprint, cards, slotIssues, slotValues } from "../styles/blueprint/style.ts";
import { atMax } from "../styles/catalog.ts";
import { registry, styles } from "../styles/index.ts";
import { labResolved, labViews } from "../styles/lab.ts";

const kinds = Visual.options.map((o) => o.shape.kind.value);

describe("the Blueprint catalog", () => {
  it("has a card for every visual kind", () => {
    const covered = new Set(cards.map((c) => c.kind));
    expect(kinds.filter((k) => !covered.has(k))).toEqual([]);
  });
  it("names cards <style>.<tier>.<purpose or kind>[.<treatment>], each once", () => {
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of cards) {
      expect(c.id).toMatch(/^blueprint\.(t1|t2|overlay)\.[a-z0-9-]+(\.[a-z0-9-]+)?$/);
      expect(c.id.split(".")[1]).toBe(c.tier);
    }
  });
  it("declares typed limits on every slot: maxChars on text, maxItems on lists", () => {
    for (const c of cards) {
      expect(c.slots.length, c.id).toBeGreaterThan(0);
      for (const s of c.slots) {
        if (s.type === "text" || s.type === "richtext") expect(s.maxChars, `${c.id} ${s.name}`).toBeGreaterThan(0);
        if (s.type === "list") expect(s.maxItems, `${c.id} ${s.name}`).toBeGreaterThan(0);
      }
    }
  });
  it("has a sample for every card, or says why not", () => {
    for (const c of cards) expect(!!c.sample || !!c.noSample, c.id).toBe(true);
  });
  it("gives samples that are valid plans, fill their required slots and keep under every max", () => {
    for (const c of cards.filter((x) => x.sample)) {
      const v = c.sample!.visual;
      expect(() => Visual.parse(v), c.id).not.toThrow();
      expect(v.kind).toBe(c.kind);
      for (const s of c.slots) if (!s.optional && s.type !== "anchor") expect(slotValues(v, s.name).length, `${c.id} ${s.name}`).toBeGreaterThan(0);
      expect(slotIssues(v), c.id).toEqual([]);
    }
  });
  it("labels illustrative numbers as illustrations", () => {
    for (const c of cards.filter((x) => x.sample && (x.kind === "chart" || x.kind === "kpi"))) expect((c.sample!.visual as { source: string }).source).toBe("Illustration");
  });
  it("adds at least eight new card kinds", () => {
    expect(new Set(cards.filter((c) => c.added).map((c) => c.kind)).size).toBeGreaterThanOrEqual(8);
  });
  it("flags a slot over its max", () => {
    const v = { kind: "kpi", items: [{ value: "123456789", label: "x" }, { value: "1", label: "y" }], source: "Illustration" } as const;
    expect(slotIssues(v as never)[0]).toMatch(/items\[\]\.value/);
  });
  it("builds a playable plan for every view of every sampled card", () => {
    for (const c of cards.filter((x) => x.sample))
      for (const { size, tone } of labViews(c)) {
        const r = labResolved(c, size, tone)!;
        expect(r.shots[0].visual?.times?.length, c.id).toBeGreaterThan(0);
        expect(r.duration).toBeGreaterThanOrEqual(4.5);
      }
  });
  it("matches the committed registry.json, and every registered style has a folder with its files", () => {
    const json = JSON.parse(readFileSync(new URL("../styles/registry.json", import.meta.url), "utf8"));
    expect(json).toEqual(JSON.parse(JSON.stringify(registry())));
    for (const st of styles)
      for (const f of ["tokens.ts", "style.ts", "style.json", "DESIGN.md"]) expect(() => readFileSync(new URL(`../styles/${st.id}/${f}`, import.meta.url)), `${st.id}/${f}`).not.toThrow();
  });
  it("matches the committed style.json", () => {
    const json = JSON.parse(readFileSync(new URL("../styles/blueprint/style.json", import.meta.url), "utf8"));
    expect(json).toEqual(JSON.parse(JSON.stringify(blueprint)));
  });
});

// The panels a card can be given: the 50/50 split under a header, the inset split, a scene,
// and the 16:9 side panel.
const SIZES: [string, number, number][] = [
  ["split", 900, 686],
  ["inset", 900, 856],
  ["scene", 960, 1130],
  ["side", 1350, 860],
];

const stress = (c: (typeof cards)[number]) => atMax(c)!.visual as never;

const check = (label: string, g: Geom, w: number, h: number) => {
  const inside = (b: { x: number; y: number; w: number; h: number }, what: string) => {
    expect(b.x, `${label} ${what} left`).toBeGreaterThanOrEqual(-0.5);
    expect(b.y, `${label} ${what} top`).toBeGreaterThanOrEqual(-0.5);
    expect(b.x + b.w, `${label} ${what} right`).toBeLessThanOrEqual(w + 0.5);
    expect(b.y + b.h, `${label} ${what} bottom`).toBeLessThanOrEqual(h + 0.5);
  };
  g.cards.forEach((c, i) => {
    inside(c.box, `card ${i}`);
    // Nothing touches a card's edge: its content leaves at least the padding above and below.
    expect(c.box.h - c.content, `${label} card ${i} padding`).toBeGreaterThanOrEqual(c.pad * 2 - 0.5);
    expect(c.pad, `${label} card ${i} pad`).toBeGreaterThanOrEqual(20);
  });
  g.parts.forEach((b, i) => inside(b, `part ${i}`));
  for (const f of g.texts) {
    const k = f.font === "mono" ? style.font.monoWidth : f.font === "serif" ? 0.5 : style.font.sansWidth;
    const width = f.text.replace(/\*/g, "").length * (f.size * k + f.tracking);
    expect(width, `${label} "${f.text}" at ${f.size}px`).toBeLessThanOrEqual(f.room * f.lines + 0.5);
    // Readable on a phone.
    expect(f.size, `${label} "${f.text}" size`).toBeGreaterThanOrEqual(f.font === "mono" ? style.font.labelMin : style.font.minSize);
  }
};

describe("Blueprint cards: padding, bounds and readable type", () => {
  const added = cards.filter((c) => c.added && c.sample);
  it("lays out every new card kind", () => {
    for (const c of added) expect(cardGeom(c.sample!.visual, 900, 686), c.id).toBeDefined();
  });
  for (const c of added)
    for (const [name, w, h] of SIZES)
      it(`${c.id} fits a ${name} panel (${w}x${h}), with its sample and at its slot maxes`, () => {
        check(`${c.id} ${name} sample`, cardGeom(c.sample!.visual, w, h)!, w, h);
        check(`${c.id} ${name} max`, cardGeom(stress(c), w, h)!, w, h);
      });
  it("keeps even padding: the space under a row card's last row equals the space above its first", () => {
    for (const c of added.filter((x) => x.kind === "agenda" || x.kind === "checklist")) {
      const g = cardGeom(c.sample!.visual, 900, 686)!;
      const card = g.cards[0];
      expect(card.box.h - card.content).toBeCloseTo(card.pad * 2);
    }
  });
});

describe("tokens keep the house look", () => {
  it("give the split canvas and both tones Ivory's values (2026-10-22)", async () => {
    const { t } = await import("../src/theme.ts");
    const { pal } = await import("../src/soft.tsx");
    expect(t).toMatchObject({ canvas: "#F4F1EA", ink: "#1A2622", accent: "#213B34", highlight: "rgba(33,59,52,0.16)" });
    expect(pal("light")).toMatchObject({ bg: "#F4F1EA", accentText: "#213B34", shadow: "none" });
    expect(pal("dark")).toMatchObject({ bg: "#213B34", ink: "#F7F3EC", accent: "#B7CDBF", accentText: "#E9EFEA" });
  });

});

describe("style lab review", () => {
  it("sends a changed card back to waiting and keeps the old note", async () => {
    const { mergeStyleReview } = await import("../review/styles.ts");
    const first = mergeStyleReview(undefined, { id: "blueprint", cards }, "t0");
    const id = cards[0].id;
    first.cards[id] = { ...first.cards[id], status: "change", comment: "bigger number" };
    const edited = [{ ...cards[0], summary: "changed" }, ...cards.slice(1)];
    const next = mergeStyleReview(first, { id: "blueprint", cards: edited }, "t1");
    expect(next.cards[id].status).toBe("waiting");
    expect(next.cards[id].history.at(-1)?.comment).toBe("bigger number");
    expect(next.cards[cards[1].id]).toEqual(first.cards[cards[1].id]);
  });
});

// herk-edit-kit hardcodes its accent in most Kallaway cards, so a token change misses them. Ours
// may not: the style-driven components take every colour from the active style's tokens.
describe("tokens only", () => {
  it("has no literal colours in the card, element or scene components", () => {
    for (const f of ["../src/cards.tsx", "../src/elements.tsx", "../src/soft.tsx"]) {
      const code = readFileSync(new URL(f, import.meta.url), "utf8")
        .split("\n")
        .filter((l) => !l.trim().startsWith("//"))
        .join("\n");
      expect(code.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\(\s*\d/g), f).toBeNull();
    }
  });
});

// Every style in the library. A new style is a folder next to blueprint/ (start with
// `npm run reel -- styles new <id>`), added here. `npm run reel -- styles --write` regenerates each
// style's style.json and the library's registry.json from these.
import type { StyleDef } from "./catalog";
import { ivory } from "./ivory/style";

// Ivory is the only style. Blueprint (styles/blueprint/) is its card catalog base, not a look.
export const styles: StyleDef[] = [ivory];

export const styleById = (id: string) => styles.find((s) => s.id === id);

// The library index an editor queries by style, tier and purpose: every card's id, kind, slots and
// limits, without sample content.
export const registry = () => ({
  generated: "npm run reel -- styles --write",
  styles: styles.map((s) => ({
    id: s.id,
    name: s.name,
    number: s.number,
    status: s.status,
    folder: `styles/${s.id}`,
    summary: s.summary,
    cards: s.cards.map(({ sample, noSample, ...c }) => ({ ...c, preview: !!sample })),
  })),
});

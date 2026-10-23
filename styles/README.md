# Style library

Named looks for the reel editor, each with a catalog of cards. The structure follows
herk-edit-kit's `style-library/`: one folder per style, a design spec, tokens, a card catalog with
tiers, purposes and typed slots, a generated registry, and a review loop.

```
styles/
  catalog.ts       the shared shape: StyleTokens, Card, Slot (maxChars, minItems, maxItems), StyleDef, slot checks
  index.ts         the registered styles, and the registry an editor queries
  registry.json    generated: every style's cards, slots and limits (no sample content)
  lab.ts           builds the one-shot plans the style lab and contact sheets play
  _template/       DESIGN.md skeleton for a new style
  blueprint/       style 01, the house look
    tokens.ts      palette, type, spacing, grid, motion (StyleTokens)
    style.ts       the card catalog, with sample content (StyleDef)
    style.json     generated from style.ts
    DESIGN.md      the spec, card picking table, what not to do
    samples.ts     inline, clearly labelled stand-ins for captures, logos and thumbnails
    review.json    Owain's Approve / Change and notes per card, from the style lab
    checks/        contact sheets (git-ignored)
```

## Cards

A card is a visual kind (`src/schema.ts`, drawn by `src/Visuals.tsx`, `src/elements.tsx`,
`src/soft.tsx` or `src/cards.tsx`) as this style offers it: an id
`<style>.<tier>.<purpose or kind>[.<treatment>]`, a tier (`t1` full frame, `t2` beside the
speaker, `overlay` over the picture), the layouts it fits, and its slots. Slot limits are typed
(`maxChars`, `minItems`, `maxItems`), every card is sized and tested for them, and `validate`
warns when a plan goes past one. Components take every colour, size and duration from tokens;
`tests/catalog.test.ts` fails on a literal colour in them.

## Commands

```bash
npm run reel -- styles --style blueprint
```

```bash
npm run reel -- styles --write
```

```bash
npm run reel -- styles stills
```

```bash
npm run reel -- styles feedback
```

```bash
npm run reel -- styles new aurora
```

The style lab is on the review board (`npm run reel -- review`): every card plays live, light and
dark, split and scene, with sample text or every slot at its max.

## Adding a style

1. `npm run reel -- styles new <id>` copies Blueprint's tokens, catalog and samples under the new id and the DESIGN.md skeleton.
2. Write `DESIGN.md` from references, then change `tokens.ts` to match it.
3. Keep, drop or add cards in `style.ts`. A new kind needs a schema entry, a component that reads tokens, anchors in `tools/resolve.ts` `visualAnchors`, and a geometry function tested in `tests/catalog.test.ts`.
4. Register it in `styles/index.ts`, run `styles --write`, and review it in the style lab.

Rendering reads the active style from `src/style.ts`, so one style renders at a time. Point that
import at the new folder to see it in the lab and in reels.

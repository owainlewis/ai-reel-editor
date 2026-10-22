# Blueprint: design spec

The house look for Owain's reels and YouTube graphics, picked from his notes in October 2026.
`docs/RULES.md` wins over anything here. The numbers live in `tokens.ts`; the cards live in
`style.ts` (and `style.json`, written from it). Review every card live in the style lab:
`npm run reel -- review`, then "Blueprint style lab".

## Style prompt

Calm, architectural, real. The frame is cool paper or graphite with a quiet blueprint grid behind
it, like a drafting sheet. Headlines are set like film titles: one serif, regular, tight, never a bold
sans with an italic word dropped in. On the page sit white cards with real shadows, small Helvetica
for the working text, and one clean blue for the thing being said. Graphics go in the
top half of a 50/50 split with Owain on the bottom half; full-frame scenes are kept for one or two
big beats. Every graphic shows something real (a capture, an official logo, a sourced number) or is
an honest diagram. Things not yet said sit dim and soft, then sharpen on their word.

## Palette

| Token | Light (paper) | Dark (graphite) | Use |
| --- | --- | --- | --- |
| `bg` | `#ECEEF1` | `#121417` | the canvas |
| `card` | `#FFFFFF` | `#1B1E22` | cards |
| `chip` | `#E2E5EA` | `#262A2F` | chips, quiet fills |
| `ink` | `#0E1013` | `#ECEEF1` | type |
| `muted` | `#6E737B` | `#8B9097` | labels, secondary type |
| `faint` | `#C6CBD2` | `#3A3F45` | waiting parts, unticked boxes |
| `line` | ink at 10% | ink at 10% | hairlines, card edges |
| `accent` | `#2563EB` | `#2563EB` | splashes: dots, bars, lines, chips, highlights |
| `accentText` | `#2563EB` | `#A6ABB3` | the accent word in type |

- One blue, flat. It is paint, never light.
- On graphite the accent word goes light grey, not blue: white and grey read calmer there.
- Logos always sit on white tiles, in either tone.
- The split canvas is paper by default. A split shot can set `tone: "dark"` for graphite.

## Type

Owain's brand is two families, Helvetica and Signifier. The voice is cinematic, not "AI deck":

- **Signifier, regular, set tight** (tracking -3.5%) for every headline: the docked header, scene headlines, titles, chapter numbers, the big stat, quotes, media captions. One face per line.
- **Helvetica Neue** for working text: card rows and titles, labels, numbers (tabular figures), axes, sources, the browser's address. Small labels are medium weight in tracked caps.
- **Accent words** (`*word*`) change colour only (`accentText`: blue on paper, grey on graphite), never face or style. No italic word dropped into a sans line.
- **Mono** only for text that is code: terminal lines, file names on a flow's chip.
- Sizes are fitted, not fixed: every card sizes its type so the longest slot at its max fits its room. Nothing under 26 px for words or 24 px for labels, at 1080 px wide.
- Scene headlines: 150 px, or 126 px when they need two lines; under 26 characters.

## Spacing

- Split and media panels: 90 px side margins, 20 px clear above the seam.
- Scenes: 60 px side margins for the visual, 70 px for the headline.
- Inside a card: the same padding on every side (44 px, 32 px for small cells and tiles). A card's height is computed from the content it stacks, so the space under the last row equals the space above the first. `tests/catalog.test.ts` checks every new card at the split, inset, scene and 16:9 sizes, with its sample and with every slot filled to its max.
- Gaps between cards: 28 px (20 px in a bento, 14 px between layers).
- Radius: 28 px on cards, 18 px on chips and small cards.

## The blueprint grid

A static layer behind every graphic, very low contrast:

- a 120 px hairline grid (ink at 4.5%, 5% on graphite);
- the panel's margin guides as long rules (ink at 9%);
- crosshairs on every other intersection of every third row (ink at 20%);
- registration ticks in the four corners.

It never moves and never competes with the graphic. Grain sits over scenes at 5% (9% on graphite).

## Motion

- One entrance verb: arrive out of a light blur (8 px), rising a little, on an expo-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`), in about 0.45 s.
- Parts land on their spoken words. Unanchored parts cascade about 0.12 s apart.
- Things waiting to be said sit dim and soft (agenda rows, unticked boxes, unnamed pipeline stages), then sharpen.
- The part being said takes the accent: a blue border, a blue dot, a blue number. Earlier parts step back to muted.
- Numbers count up in whole steps; a value keeps its decimals.
- One camera move per shot, on one curve. Nothing bounces, pulses or loops for decoration.

## Tiers

- **t1, full frame:** a `scene` takeover. For one or two big beats per reel: a chapter, the thesis, a big number, a quote, an overview.
- **t2, beside the speaker:** the top half of the 50/50 split (or `side` on 16:9). The default home for graphics.
- **overlay:** over the speaker's picture on 16:9, a lower third. No box, no scrim.

Most cards work in both t1 and t2; the catalog's `layouts` says where each can go.

## Cards

See `style.json` for every card's id, slots and limits (`maxChars`, `minItems`, `maxItems`) and its
`duration` (t1 2.5 to 7 s, t2 1.5 to 5 s, overlay 2.5 to 6 s; build longer cards across shots with
`keep`). New in this catalog: `agenda`, `beforeafter`, `kpi`, `matrix`, `timeline`, `levels` (a
layer stack), `checklist`, `quote`, `logowall`, `bento`, and the stat shapes `ring`, `meter` and
`waffle`.

Picking a card for a line:

| The line has | Card |
| --- | --- |
| an article or web page | `t2.capture.browser` |
| a code repository | `t2.capture.repo` |
| two or three sources at once | `t1.windows` |
| a post, screenshot or photo | `t2.capture.card` |
| a few product names | `t2.logos`; many at once: `t1.logowall` |
| one number | `t1.stat`; two to four: `t2.kpi`; a series: `t2.chart.bar` or `t2.chart.line` |
| a share or a percentage | `t2.stat.ring`; "N in 100": `t2.stat.waffle`; a value on a scale: `t2.stat.meter` |
| old against new | `t2.compare` (struck through) or `t2.beforeafter` (two states with an arrow) |
| a sequence | `t2.steps`, `t2.pipeline` (named stages), `t2.timeline` (dated) |
| parts that build on each other | `t2.levels` |
| parts that talk | `t2.flow`; many into one: `t1.funnel` |
| a trade-off between two qualities | `t1.matrix` |
| what the video covers | `t2.agenda` (call back with `active`) |
| things to do or check | `t2.checklist` |
| a feature set | `t1.bento` |
| someone's words | `t1.quote` |
| a section change | `t1.chapter` |

## Lineage: what came from Kallaway, flat

The structure is herk-edit-kit's style library: one folder per style, a spec, tokens, cards with
`<style>.<tier>.<purpose>.<treatment>` ids, typed slots, durations, a generated registry and a
contact sheet. Blueprint goes further on two of its gaps: slot limits are typed and tested (Kallaway
keeps them in comments), and components may not hold a literal colour (Kallaway hardcodes its
accent in most cards).

Ported from Kallaway's cards, without glow, glass or gradients:

- **Focus pull.** Parts resolve from a blur as they arrive. Kallaway uses 10 to 22 px on black; on paper 8 px reads right.
- **One tween drives shape and number.** The ring's arc, its tip dot and the count move together; so do the meter's fill and the waffle's dots.
- **Drawn lines.** Axes draw out from the centre, connectors and ticks draw along their path, the timeline's track fills from milestone to milestone.
- **Feature first.** In a bento the wide cell lands before the small ones.
- **Bottom-up stacks.** Layers drop onto the stack from the foundation up.
- **Odometer counts** (the `grid` count) and whole-step count-ups that slow into their value.
- **Word-anchored timing.** Kallaway staggers 0.10 to 0.18 s by index; Blueprint lands each part on its own spoken word and cascades only parts the plan leaves unanchored.

Left out on purpose: the aurora bloom, glass cards, edge lighting, text glow, gradient fills, breathing
glow pulses, drifting groups and `back.out` springs (nothing bounces here).

## What not to do

- No bold sans headline with one italic serif word. It reads as a template. Headlines are one serif; an accent is colour only.

- No glow, no aurora, no gradients, no neon, no light effects. Depth comes from real shadows and layering.
- No warm cream, no vermilion or clay: they read as Anthropic's brand.
- No second accent colour, and no blue accent words on graphite.
- No extreme close-ups. A punch is a gentle 1.12x push; the head is never more than 40% of the frame.
- Nothing touching a card's edge, the panel's margins or the seam. Padding is even on every side.
- One graphic per panel. At most one diagram per scene; build it across beats with `keep`.
- Real content only: no invented numbers, results, UI or quotes, no redrawn logos. A chart or KPI whose numbers are only a shape says "Illustration".
- No text card that just sits there: every card has a part that lands on a word.
- No shrinking a whole web page to phone size; crop to the phrase.
- No emoji, no cartoon icons, nothing bouncing.

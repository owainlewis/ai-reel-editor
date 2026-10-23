# <Name>: design spec

The source of truth for this style's look. Fill every section before building cards; the numbers
go in `tokens.ts`, never in components. `docs/RULES.md` still wins over anything here.

## Style prompt

One paragraph: the canvas, the surfaces, the type, the one accent, how things move, and how the
graphics sit relative to the speaker (t1 takes over the frame, t2 sits beside the speaker).

## Palette

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | | | the canvas |
| `card` | | | cards |
| `chip` | | | chips, quiet fills |
| `ink` | | | type |
| `muted` | | | labels |
| `faint` | | | waiting parts |
| `line` | | | hairlines |
| `accent` | | | splashes |
| `accentText` | | | the accent word |

## Type

Display, accent and mono faces, weights, tracking, and the floors (`minSize`, `labelMin`).

## Spacing

Panel margins, card padding, gaps, radii.

## Background

What sits behind every graphic (grid, grain, nothing), and its contrast.

## Motion

The entrance verb (blur, offset, curve, duration), the stagger, what the said part does, numbers,
connectors, exits.

## Cards

Which cards this style keeps from the shared kinds, any it adds, and a table that maps a kind of
line to a card.

## What not to do

The look's own don'ts, plus the rules from `docs/RULES.md` that apply to it.

# Ivory: design spec

The house style, and the only one (Owain, 2026-10-22). Warm off-white and pine green, after Tom Noske's reels but deliberately not a copy (see `references/reels/noske-*`), with Kallaway's bare curve charts. It shares Blueprint's card catalog; `tokens.ts` and the `look` switches restyle it.

## Palette

- Paper `#F4F1EA`: a warm off-white, a touch brighter than Noske's, never pure white.
- Pine `#213B34`: dark scenes, and the accent on paper. Deeper and cooler than Noske's teal-green.
- Ink `#1A2622` (green-black) on paper.
- Text on green and on footage is a near-white warm `#F7F3EC` (Owain: "a bit more white"). Accent words on green are `#E9EFEA`.
- The splash on green (dots, lines, chips) is a soft sage `#B7CDBF`, where Noske uses a peach.
- No blue, no orange, no glow, no gradients.

## Type

Helvetica and Signifier, always (Owain, 2026-10-22).

- **Helvetica Neue 800, lowercase, tight tracking:** the big word, headlines and keyword captions.
- **Signifier italic:** the one phrase that matters, in a stacked emphasis (about once a section) or an accent word.
- **Labels, axes and numbers:** small Helvetica, tracked when uppercase. No mono.

## Layout

- One big thing per beat. If a graphic needs a card, a list of five rows and a header, it is two beats.
- No card chrome. Cards are the paper with a hairline, no white box and no shadow.
- No grid. The space is the design: wider margins (110 px) and more padding (56 px) than Blueprint.

## Signature moves

- **Keyword captions:** one heavy lowercase word at a time on the speaker's chest, up to 170 px, fitted to the width. An accent word is set in Signifier italic.
- **Focus-stack chapters:** a huge Signifier italic numeral held soft and blurred behind one sharp heavy word. Both drift slowly at different speeds.
- **Bare charts:** two thin axes, a smooth curve that draws itself, dots landing on the spoken points. Real numbers with a source, or "Illustration".

## Motion

0.6 s enters out of a 14 px blur on the house expo-out curve, with 0.16 s staggers. Nothing bounces. One camera move per shot.

## What not to do

- No glow, gradients, neon, particles or 3D.
- No fonts other than Helvetica and Signifier.
- No white cards with shadows: that is Blueprint's look.
- No extreme close-ups. Nothing touching a card edge.
- No colour grading or voice processing: Owain does both in Final Cut.

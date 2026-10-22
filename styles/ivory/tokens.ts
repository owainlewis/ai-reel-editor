// Ivory: warm off-white and deep green, after Tom Noske's reels (Owain, 2026-10-22). Helvetica Neue
// for everything plain and heavy, Signifier italic for the one phrase that matters: Owain asked for
// those two fonts always, so labels are small tracked Helvetica, not mono. One big thing per beat,
// no card chrome, no grid. See DESIGN.md next to this file.

import type { StyleTokens, ToneTokens } from "../catalog";

const GREEN = "#2C4441";
const IVORY = "#F2EEE6";

export const tokens = {
  id: "ivory",
  name: "Ivory",
  color: {
    light: {
      bg: IVORY,
      // Cards are the paper itself with a hairline: no white boxes, no shadows.
      card: IVORY,
      chip: "#E7E1D6",
      ink: "#1C2B27",
      muted: "#6F7772",
      faint: "#CFC8BB",
      line: "rgba(28,43,39,0.14)",
      accent: GREEN,
      accentText: GREEN,
      shadow: "none",
    } satisfies ToneTokens,
    dark: {
      bg: GREEN,
      card: GREEN,
      chip: "#3A5754",
      ink: IVORY,
      muted: "#A7B4AE",
      faint: "#4D6864",
      line: "rgba(242,238,230,0.16)",
      // On green the splash is a warm ivory-peach, like Noske's words over footage.
      accent: "#E6D3C2",
      accentText: "#E6D3C2",
      shadow: "none",
    } satisfies ToneTokens,
    split: {
      line: "rgba(28,43,39,0.12)",
      shadow: "none",
      highlight: "rgba(44,68,65,0.16)",
    },
    terminal: "#1C2B27",
    onAccent: IVORY,
  },
  font: {
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    serif: 'Signifier, "Iowan Old Style", Georgia, serif',
    // Labels, numbers and axes stay in Helvetica: two fonts, always.
    mono: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    sansWidth: 0.56,
    monoWidth: 0.56,
    minSize: 28,
    labelMin: 26,
  },
  space: {
    // More air than Blueprint: wider margins and padding.
    panelX: 110,
    seamGap: 40,
    sceneX: 80,
    headlineX: 90,
    cardPad: 56,
    cardPadSmall: 40,
    gap: 36,
    radius: 6,
    radiusSmall: 4,
  },
  // No blueprint layer: the space is the design.
  grid: {
    ink: { light: "28,43,39", dark: "242,238,230" },
    cell: 120,
    hair: { light: 0, dark: 0 },
    rule: { light: 0, dark: 0 },
    mark: { light: 0, dark: 0 },
    tick: 0,
    marginReel: 110,
    marginScene: 80,
    marginWide: 120,
  },
  motion: {
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    // Slower and softer than Blueprint: things glide in out of a deeper blur.
    enter: 0.6,
    settle: 0.8,
    stagger: 0.16,
    blur: 14,
  },
  look: {
    // One heavy lowercase word at a time over the speaker, Noske style.
    captions: "keyword",
    // A huge blurred numeral behind one sharp word.
    chapter: "stack",
    // Bare axes, a smooth drawn line, dots on the spoken points.
    chart: "bare",
  },
} as const satisfies StyleTokens;

export type Tokens = typeof tokens;

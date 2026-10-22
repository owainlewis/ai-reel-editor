// Ivory: warm off-white and deep green, after Tom Noske's reels (Owain, 2026-10-22). Helvetica Neue
// for everything plain and heavy, Signifier italic for the one phrase that matters: Owain asked for
// those two fonts always, so labels are small tracked Helvetica, not mono. One big thing per beat,
// no card chrome, no grid. See DESIGN.md next to this file.

import type { StyleTokens, ToneTokens } from "../catalog";

// Pine, a little deeper and cooler than Noske's teal-green, and a brighter paper (2026-10-22: "vary
// a tiny bit to avoid 100% copying Tom Noske"). Text on green and on footage is a near-white warm.
const GREEN = "#213B34";
const IVORY = "#F4F1EA";
const WHITE = "#F7F3EC";

export const tokens = {
  id: "ivory",
  name: "Ivory",
  color: {
    light: {
      bg: IVORY,
      // Cards are the paper itself with a hairline: no white boxes, no shadows.
      card: IVORY,
      chip: "#E9E4DA",
      ink: "#1A2622",
      muted: "#6F7772",
      faint: "#D0CABD",
      line: "rgba(26,38,34,0.14)",
      accent: GREEN,
      accentText: GREEN,
      shadow: "none",
    } satisfies ToneTokens,
    dark: {
      bg: GREEN,
      card: GREEN,
      chip: "#2E4A42",
      ink: WHITE,
      muted: "#A9B6B0",
      faint: "#3F5A52",
      line: "rgba(247,243,236,0.16)",
      // On green the splash is a soft sage (Noske uses a peach); accent words stay near-white.
      accent: "#B7CDBF",
      accentText: "#E9EFEA",
      shadow: "none",
    } satisfies ToneTokens,
    split: {
      line: "rgba(26,38,34,0.12)",
      shadow: "none",
      highlight: "rgba(33,59,52,0.16)",
    },
    terminal: "#1A2622",
    // Browser windows around real captures, warmed to the paper and the pine.
    window: {
      light: { bar: "#ECE7DE", field: "#E2DCD1", tab: "#F8F6F1", dot: "#CFC8BB" },
      dark: { bar: "#1B322C", field: "#264039", tab: "#2C473F", dot: "#42605A" },
    },
    onAccent: WHITE,
  },
  font: {
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    serif: 'Signifier, "Iowan Old Style", Georgia, serif',
    // Labels, numbers and axes stay in Helvetica: two fonts, always. Mono only for text that is
    // literally code (terminal lines, file names).
    label: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    code: '"SF Mono", "JetBrains Mono", Menlo, monospace',
    sansWidth: 0.56,
    labelWidth: 0.6,
    minSize: 26,
    labelMin: 24,
  },
  // The voice: headlines, headers and titles in one serif, regular, set tight like a film title;
  // an accent word changes colour only (Owain, 2026-10-22: "the sans + serif combo looks very AI").
  // Heavy lowercase Helvetica is for keyword captions and chapter words, never mixed in one line.
  type: {
    display: { family: 'Signifier, "Iowan Old Style", Georgia, serif', weight: 400, tracking: -0.035, leading: 1.04 },
    accent: "colour",
  },
  space: {
    // More air than Blueprint: wider margins and padding.
    panelX: 110,
    seamGap: 40,
    sceneX: 80,
    headlineX: 90,
    cardPad: 50,
    cardPadSmall: 36,
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

// Blueprint: the house look in one place. Cool paper and graphite with a quiet blueprint grid,
// white cards, cool ink, one clean blue. Every component reads its colour, type, spacing and
// motion from here (through src/style.ts), so swapping a style is swapping this module.
// See DESIGN.md next to this file for the rules behind the numbers.

export const ACCENT = "#2563EB";

import type { StyleTokens, ToneTokens } from "../catalog";
export type { ToneTokens };

export const tokens = {
  id: "blueprint",
  name: "Blueprint",
  color: {
    light: {
      bg: "#ECEEF1",
      card: "#FFFFFF",
      chip: "#E2E5EA",
      ink: "#0E1013",
      muted: "#6E737B",
      faint: "#C6CBD2",
      line: "rgba(14,16,19,0.10)",
      accent: ACCENT,
      accentText: ACCENT,
      shadow: "0 1px 2px rgba(14,16,19,0.06), 0 14px 36px rgba(14,16,19,0.12)",
    } satisfies ToneTokens,
    dark: {
      bg: "#121417",
      card: "#1B1E22",
      chip: "#262A2F",
      ink: "#ECEEF1",
      muted: "#8B9097",
      faint: "#3A3F45",
      line: "rgba(236,238,241,0.10)",
      accent: ACCENT,
      accentText: "#A6ABB3",
      shadow: "0 1px 2px rgba(0,0,0,0.45), 0 18px 44px rgba(0,0,0,0.55)",
    } satisfies ToneTokens,
    // The split and media canvas (always paper): a slightly finer hairline and a deeper shadow
    // under captures, tuned for cards that sit above the speaker's half.
    split: {
      line: "rgba(14,16,19,0.09)",
      shadow: "0 2px 4px rgba(20,20,30,0.04), 0 18px 50px rgba(20,20,30,0.12)",
      highlight: "rgba(37,99,235,0.18)",
    },
    terminal: "#14161B",
    // Browser windows around real captures: the bar, the URL field and the open tab, per tone.
    window: {
      light: { bar: "#F3F4F6", field: "#E5E7EB", tab: "#FFFFFF", dot: "#CDD1D7" },
      dark: { bar: "#202328", field: "#2B2F35", tab: "#32373E", dot: "#454A51" },
    },
    // Text on a filled accent chip or button.
    onAccent: "#FBFAF7",
  },
  font: {
    // Owain's brand is two families: Helvetica (bold for titles) and Signifier. Labels and numbers
    // are Helvetica too: small, tracked caps for labels, tabular figures for numbers. Mono is only
    // for text that is code (terminal lines, file names). Read from the fonts on the rendering machine.
    sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    serif: 'Signifier, "Iowan Old Style", Georgia, serif',
    label: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    code: '"SF Mono", "JetBrains Mono", Menlo, monospace',
    // Average glyph width as a share of the font size, for fitting text without measuring it.
    // Helvetica Neue Bold sits near 0.56; labels (caps and tabular figures) near 0.6.
    sansWidth: 0.56,
    labelWidth: 0.6,
    // The smallest text a card may set at 1080 px wide, still readable on a phone: 26 px for
    // words, 24 px for labels (titles, axes, sources, tags), which are short and secondary.
    minSize: 26,
    labelMin: 24,
  },
  // The voice. Headlines, headers and titles are one serif, regular, set tight, like a film title:
  // never bold sans with an italic serif word dropped in (Owain, 2026-10-22: "the sans + serif combo
  // looks very AI"). Helvetica is for small functional text: labels, numbers, card rows, UI.
  // An *accent* word changes colour only, never face or style.
  type: {
    display: { family: 'Signifier, "Iowan Old Style", Georgia, serif', weight: 400, tracking: -0.035, leading: 1.04 },
    accent: "colour",
  },
  space: {
    // Split and media panels: side margins, and the gap kept above the seam.
    panelX: 90,
    seamGap: 20,
    // Scenes: side margin of the visual and of the headline.
    sceneX: 60,
    headlineX: 70,
    // Inside a card: the same padding on every side, so nothing touches an edge.
    cardPad: 44,
    cardPadSmall: 32,
    gap: 28,
    radius: 28,
    radiusSmall: 18,
  },
  // The blueprint layer behind every graphic: static, very low contrast.
  grid: {
    // The grid's ink as r,g,b, drawn at the opacities below.
    ink: { light: "14,16,19", dark: "236,238,241" },
    cell: 120,
    hair: { light: 0.045, dark: 0.05 },
    rule: { light: 0.09, dark: 0.1 },
    mark: { light: 0.2, dark: 0.22 },
    tick: 26,
    // Margin guides: the panel margin on reels, wider on 16:9.
    marginReel: 90,
    marginScene: 60,
    marginWide: 120,
  },
  motion: {
    // Expo-out: quick to arrive, long to settle. Everything that enters uses it.
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    // Durations in seconds.
    enter: 0.45,
    settle: 0.6,
    stagger: 0.12,
    // Things not yet said sit blurred and dim, then sharpen as they land.
    blur: 8,
  },
} as const satisfies StyleTokens;

export type Tokens = typeof tokens;

import { Easing } from "remotion";

// Light editorial. Helvetica for structure, Signifier italic for one accent word.
// Both are read from the fonts installed on the rendering machine.
export const t = {
  sans: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  serif: 'Signifier, "Iowan Old Style", Georgia, serif',
  mono: '"SF Mono", "JetBrains Mono", Menlo, monospace',
  canvas: "#F2F0EB",
  card: "#FFFFFF",
  ink: "#121212",
  muted: "#74777E",
  faint: "#B8B6B0",
  line: "rgba(18,18,18,0.09)",
  accent: "#2D4FA3",
  highlight: "rgba(45,79,163,0.18)",
  terminal: "#14161B",
  shadow: "0 2px 4px rgba(20,20,30,0.04), 0 18px 50px rgba(20,20,30,0.12)",
};

export const W = 1080;
export const H = 1920;

// Split layout: visual panel on top, caption on the seam, speaker below.
export const SPLIT = { panelTop: 150, panelBottom: 880, seam: 965, speakerTop: 1040 };
// Media layout: the visual fills most of the frame, caption below it.
export const MEDIA = { panelTop: 200, panelBottom: 1260, caption: 1400 };

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

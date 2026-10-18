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

const W_ = 1080;
export const W = W_;
export const H = 1920;

// Split layout: visual panel on top, caption on the seam, speaker below.
// "half" gives the speaker the bottom half edge to edge. "inset" gives the visual about
// 60% of the frame and puts the speaker in a rounded window with a margin.
export type SplitMode = "half" | "inset";
export type Box = { left: number; top: number; width: number; height: number; radius: number };
export const splitGeom = (mode: SplitMode) =>
  mode === "inset"
    ? { panelTop: 200, panelBottom: 1090, seam: 1165, speaker: { left: 60, top: 1240, width: W_ - 120, height: 620, radius: 40 } as Box }
    : { panelTop: 200, panelBottom: 880, seam: 965, speaker: { left: 0, top: 1040, width: W_, height: 880, radius: 40 } as Box };
// The persistent header sits above the panel on split and media shots. Without a header
// the panel starts 50 px higher.
export const HEADER = { top: 64, height: 120 };
// Media layout: the visual fills most of the frame, caption below it.
export const MEDIA = { panelTop: 200, panelBottom: 1260, caption: 1400 };

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// The style lab plays each card in the real compositions (src/Reel.tsx and src/Wide.tsx), as a
// one-shot plan built from the card's sample: the 50/50 split with the speaker placeholder below,
// or a full-frame scene, in light or dark. Reveals land every 0.55 s, as if spoken.
import type { Resolved, ResolvedShot } from "../../src/schema";
import { visualAnchors } from "../../tools/resolve";
import type { Card } from "./style";

export type LabSize = "split" | "full" | "wide";
export type LabTone = "light" | "dark";

export const LAB_FPS = 30;

// Which previews a card gets: overlays play over a 16:9 picture; everything else in a split and a scene.
export const labViews = (card: Card): { size: LabSize; tone: LabTone }[] =>
  card.tier === "overlay"
    ? [{ size: "wide", tone: "dark" }]
    : (["split", "full"] as const).flatMap((size) => (["light", "dark"] as const).map((tone) => ({ size, tone })));

export const labResolved = (card: Card, size: LabSize, tone: LabTone): Resolved | null => {
  if (!card.sample) return null;
  const v = card.sample.visual;
  const n = Math.max(1, visualAnchors(v).length);
  const times = Array.from({ length: n }, (_, i) => 0.5 + i * 0.55);
  const duration = Math.max(4.5, times[times.length - 1] + 2.8);
  const shot: ResolvedShot =
    size === "wide"
      ? { start: 0, end: duration, layout: "over", visual: { ...v, times }, anchor: card.id }
      : {
          start: 0,
          end: duration,
          layout: size === "split" ? "split" : "scene",
          visual: { ...v, times },
          anchor: card.id,
          header: size === "split" ? card.sample.header : card.sample.scene,
          tone,
        };
  return {
    slug: "",
    title: card.id,
    duration,
    fps: LAB_FPS,
    video: "",
    videoSize: size === "wide" ? [1920, 1080] : [1080, 1920],
    audio: null,
    face: { x: 0.5, y: 0.3, h: 0.17 },
    grade: { brightness: 1, contrast: 1, saturate: 1 },
    split: "half",
    canvas: size === "wide" ? "youtube" : "reel",
    captions: false,
    shots: [shot],
    chunks: [],
    sfx: [],
  };
};

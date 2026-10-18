import React from "react";
import { Composition } from "remotion";
import { Reel } from "./Reel";
import type { Resolved } from "./schema";

// Props come from projects/<slug>/build/edit.resolved.json (see `reel render`).
// In the Studio, pass them with: npx remotion studio src/index.ts --props=<that file>
const empty: Resolved = {
  slug: "",
  title: "Empty",
  duration: 3,
  fps: 30,
  video: "",
  videoSize: [1080, 1920],
  audio: null,
  face: { x: 0.5, y: 0.25, h: 0.2 },
  grade: { brightness: 1, contrast: 1, saturate: 1 },
  split: "half",
  shots: [],
  chunks: [],
  sfx: [],
};

export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    defaultProps={empty}
    calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, Math.round(props.duration * props.fps)), fps: props.fps })}
  />
);

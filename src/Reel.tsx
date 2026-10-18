import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./Captions";
import { Speaker } from "./Speaker";
import { MEDIA, SPLIT, t, W } from "./theme";
import { VisualView } from "./Visuals";
import type { Resolved, ResolvedShot } from "./schema";

const panel = (layout: ResolvedShot["layout"]) =>
  layout === "split"
    ? { top: SPLIT.panelTop, height: SPLIT.panelBottom - SPLIT.panelTop }
    : { top: MEDIA.panelTop, height: MEDIA.panelBottom - MEDIA.panelTop };

// Quiet paper canvas: warm off-white with a faint dot grid.
const Canvas: React.FC = () => (
  <AbsoluteFill style={{ background: t.canvas }}>
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${t.line} 1.4px, transparent 1.4px)`,
        backgroundSize: "40px 40px",
        maskImage: "linear-gradient(to bottom, black, black 40%, transparent 70%)",
        opacity: 0.7,
      }}
    />
  </AbsoluteFill>
);

export const Reel: React.FC<Resolved> = (r) => {
  const frame = useCurrentFrame();
  const time = frame / r.fps;
  const shot = r.shots.find((s) => time >= s.start && time < s.end) ?? r.shots[r.shots.length - 1];

  return (
    <AbsoluteFill style={{ background: t.canvas }}>
      {(shot.layout === "split" || shot.layout === "media") && <Canvas />}
      <Speaker r={r} shot={shot} time={time} />

      {/* Darken the bottom of speaker shots slightly so white captions hold. */}
      {(shot.layout === "full" || shot.layout === "punch") && (
        <AbsoluteFill style={{ background: "linear-gradient(transparent 35%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.3))" }} />
      )}

      {r.shots.map((s, i) => {
        if (!s.visual || (s.layout !== "split" && s.layout !== "media")) return null;
        const from = Math.round(s.start * r.fps);
        const dur = Math.max(1, Math.round(s.end * r.fps) - from);
        const box = panel(s.layout);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={15} name={`${i + 1} ${s.layout} ${s.visual.kind}`}>
            <div style={{ position: "absolute", left: 60, width: W - 120, top: box.top, height: box.height, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <VisualView slug={r.slug} shot={s} time={time} w={W - 120} h={box.height} v={s.visual} />
            </div>
          </Sequence>
        );
      })}

      <Captions r={r} shot={shot} time={time} />
      {r.audio && <Audio src={staticFile(r.audio)} />}
    </AbsoluteFill>
  );
};

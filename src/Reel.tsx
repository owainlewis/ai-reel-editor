import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./Captions";
import { Speaker } from "./Speaker";
import { clamp, ease, HEADER, MEDIA, splitGeom, t, W, H } from "./theme";
import { Accented, VisualView } from "./Visuals";
import type { Resolved, ResolvedShot } from "./schema";

// The header is large on the first shot (the on-screen hook in frame 1), then docks small.
const headerSize = (first: boolean) => (first ? { font: 72, height: 190 } : { font: 48, height: 104 });

const panel = (s: ResolvedShot, r: Resolved, first: boolean) => {
  const bottom = s.layout === "split" ? splitGeom(r.split).panelBottom : MEDIA.panelBottom;
  const top = s.header ? HEADER.top + headerSize(first).height + 20 : 150;
  return { top, height: bottom - top };
};

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

const Header: React.FC<{ text: string; first: boolean; time: number; start: number }> = ({ text, first, time, start }) => {
  const size = headerSize(first);
  // Visible from the very first frame; it only settles a few pixels as it lands.
  const settle = interpolate(time, [start, start + 0.3], [10, 0], { ...clamp, easing: ease });
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: HEADER.top,
        height: size.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        translate: `0 ${settle}px`,
        fontFamily: t.sans,
        fontWeight: 700,
        fontSize: size.font,
        lineHeight: 1.04,
        letterSpacing: -size.font * 0.03,
        color: t.ink,
        textWrap: "balance",
      }}
    >
      <span>
        <Accented text={text} />
      </span>
    </div>
  );
};

export const Reel: React.FC<Resolved> = (r) => {
  const frame = useCurrentFrame();
  const time = frame / r.fps;
  const index = Math.max(0, r.shots.findIndex((s) => time >= s.start && time < s.end));
  const shot = r.shots[index] ?? r.shots[r.shots.length - 1];
  const grade = `brightness(${r.grade.brightness}) contrast(${r.grade.contrast}) saturate(${r.grade.saturate})`;
  const onCanvas = shot.layout === "split" || shot.layout === "media";

  return (
    <AbsoluteFill style={{ background: t.canvas }}>
      {onCanvas && <Canvas />}
      <Speaker r={r} shot={shot} time={time} />

      {/* Darken the bottom of speaker shots slightly so white captions hold. */}
      {(shot.layout === "full" || shot.layout === "punch") && (
        <AbsoluteFill style={{ background: "linear-gradient(transparent 35%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.3))" }} />
      )}

      {r.shots.map((s, i) => {
        if (!s.visual) return null;
        const from = Math.round(s.start * r.fps);
        const dur = Math.max(1, Math.round(s.end * r.fps) - from);
        if (s.layout === "cutaway")
          return (
            <Sequence key={i} from={from} durationInFrames={dur} premountFor={15} name={`${i + 1} cutaway`}>
              <AbsoluteFill>
                <VisualView slug={r.slug} shot={s} time={time} w={W} h={H} v={s.visual} filter={grade} bleed />
                <AbsoluteFill style={{ background: "linear-gradient(transparent 55%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.5))" }} />
              </AbsoluteFill>
            </Sequence>
          );
        if (s.layout !== "split" && s.layout !== "media") return null;
        const box = panel(s, r, i === 0);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={15} name={`${i + 1} ${s.layout} ${s.visual.kind}`}>
            <div style={{ position: "absolute", left: 60, width: W - 120, top: box.top, height: box.height, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <VisualView slug={r.slug} shot={s} time={time} w={W - 120} h={box.height} v={s.visual} filter={grade} />
            </div>
          </Sequence>
        );
      })}

      {onCanvas && shot.header && <Header text={shot.header} first={index === 0} time={time} start={shot.start} />}
      <Captions r={r} shot={shot} time={time} />
      {r.audio && <Audio src={staticFile(r.audio)} />}
    </AbsoluteFill>
  );
};


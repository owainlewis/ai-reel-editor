import React from "react";
import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { pal, SceneCanvas, type Tone } from "./soft";
import { clamp, ease, t } from "./theme";
import { Accented, VisualView } from "./Visuals";
import type { Chunk, Resolved, ResolvedShot } from "./schema";

// YouTube, 16:9. The picture is a rough cut Owain edited by hand; this only lays graphics and
// text over it, sparsely. Minimal: one idea on screen, monochrome plus one accent, serif titles,
// motion only to reveal. See references/README.md.
export const WW = 1920;
export const WH = 1080;

type Box = { x: number; y: number; w: number; h: number; r: number; o: number };
const FULL: Box = { x: 0, y: 0, w: WW, h: WH, r: 0, o: 1 };
// The speaker's window on a side shot, and the area the visual gets beside it.
const WINDOW: Box = { x: WW - 48 - 330, y: (WH - 440) / 2, w: 330, h: 440, r: 22, o: 1 };
export const SIDE = { x: 120, y: 110, w: WINDOW.x - 72 - 120, h: WH - 220 };
export const MEDIA = { x: 160, y: 90, w: WW - 320, h: WH - 180 };
// How long the speaker takes to move between full frame and the window: one eased move.
const MOVE = 0.5;

const speakerBox = (layout: ResolvedShot["layout"]): Box =>
  layout === "side" ? WINDOW : layout === "media" || layout === "cutaway" ? { ...WINDOW, o: 0 } : FULL;

const lerp = (a: Box, b: Box, p: number): Box => ({
  x: a.x + (b.x - a.x) * p,
  y: a.y + (b.y - a.y) * p,
  w: a.w + (b.w - a.w) * p,
  h: a.h + (b.h - a.h) * p,
  r: a.r + (b.r - a.r) * p,
  o: a.o + (b.o - a.o) * p,
});

// Where the footage sits inside a box: covering it, with the face kept in view. In the small
// window the head fills about 40% of its height.
const crop = (r: Resolved, box: Box) => {
  const [sw, sh] = r.videoSize;
  const cover = Math.max(box.w / sw, box.h / sh);
  const window = box.w < WW * 0.5;
  const scale = window ? Math.max(cover, (0.4 * box.h) / (r.face.h * sh)) : cover;
  const vw = sw * scale;
  const vh = sh * scale;
  const x = Math.min(0, Math.max(box.w - vw, box.w / 2 - r.face.x * vw));
  const y = Math.min(0, Math.max(box.h - vh, (window ? 0.45 : r.face.y) * box.h - r.face.y * vh));
  return { x, y, vw, vh };
};

const Speaker: React.FC<{ r: Resolved; shot: ResolvedShot; prev?: ResolvedShot; time: number; dim: number }> = ({ r, shot, prev, time, dim }) => {
  const p = interpolate(time, [shot.start, shot.start + MOVE], [0, 1], { ...clamp, easing: ease });
  const box = lerp(speakerBox(prev?.layout ?? shot.layout), speakerBox(shot.layout), p);
  const a = crop(r, speakerBox(prev?.layout ?? shot.layout));
  const b = crop(r, speakerBox(shot.layout));
  const c = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, vw: a.vw + (b.vw - a.vw) * p, vh: a.vh + (b.vh - a.vh) * p };
  const grade = `brightness(${r.grade.brightness * dim}) contrast(${r.grade.contrast}) saturate(${r.grade.saturate})`;
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        borderRadius: box.r,
        overflow: "hidden",
        opacity: box.o,
        boxShadow: box.r > 1 ? "0 2px 6px rgba(0,0,0,0.4), 0 24px 60px rgba(0,0,0,0.5)" : "none",
        background: "#121417",
      }}
    >
      {r.video && (
        <Video src={staticFile(r.video)} muted={!!r.audio} style={{ position: "absolute", left: c.x, top: c.y, width: c.vw, height: c.vh, filter: grade }} />
      )}
    </div>
  );
};

const reveal = (time: number, at: number, dur = 0.6) => interpolate(time, [at, at + dur], [0, 1], { ...clamp, easing: ease });

// A lower third: serif title, sans line under it, a short rule that draws first. No box, no scrim.
const Lower: React.FC<{ title: string; sub?: string; shot: ResolvedShot; time: number }> = ({ title, sub, shot, time }) => {
  const rule = reveal(time, shot.start, 0.5);
  const a = reveal(time, shot.start + 0.15);
  const b = reveal(time, shot.start + 0.3);
  const out = interpolate(time, [shot.end - 0.4, shot.end], [1, 0], clamp);
  const shadow = "0 1px 2px rgba(0,0,0,0.5), 0 2px 18px rgba(0,0,0,0.35)";
  return (
    <div style={{ position: "absolute", left: 120, bottom: 120, opacity: out, color: "#ECEEF1" }}>
      <div style={{ width: 64, height: 2, background: "#ECEEF1", scale: `${rule} 1`, transformOrigin: "left", marginBottom: 22 }} />
      <div style={{ fontFamily: t.serif, fontSize: 64, lineHeight: 1.05, letterSpacing: -1.2, textShadow: shadow, opacity: a, filter: `blur(${(1 - a) * 8}px)` }}>
        <Accented text={title} />
      </div>
      {sub && <div style={{ marginTop: 12, fontFamily: t.sans, fontWeight: 500, fontSize: 28, color: "rgba(236,238,241,0.75)", textShadow: shadow, opacity: b }}>{sub}</div>}
    </div>
  );
};

// A cinematic title over the picture: one small, tightly set serif line in the centre.
const OverTitle: React.FC<{ text: string; kicker?: string; shot: ResolvedShot; time: number }> = ({ text, kicker, shot, time }) => {
  const a = reveal(time, shot.start + 0.2, 0.8);
  const out = interpolate(time, [shot.end - 0.5, shot.end], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      {kicker && <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: 22, letterSpacing: 8, textTransform: "uppercase", color: "rgba(236,238,241,0.7)", marginBottom: 22, opacity: a }}>{kicker}</div>}
      <div style={{ fontFamily: t.serif, fontSize: 76, letterSpacing: -2, lineHeight: 1.05, color: "#ECEEF1", textAlign: "center", maxWidth: 1300, opacity: a, filter: `blur(${(1 - a) * 10}px)` }}>
        <Accented text={text} />
      </div>
    </AbsoluteFill>
  );
};

const Captions: React.FC<{ chunk?: Chunk }> = ({ chunk }) =>
  !chunk ? null : (
    <div style={{ position: "absolute", left: 200, right: 200, bottom: 70, textAlign: "center", fontFamily: t.sans, fontWeight: 700, fontSize: 46, letterSpacing: -0.8, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.6), 0 2px 18px rgba(0,0,0,0.4)" }}>
      {chunk.words.map((w) => w.text).join(" ")}
    </div>
  );

export const Wide: React.FC<Resolved> = (r) => {
  const frame = useCurrentFrame();
  const time = frame / r.fps;
  const index = Math.max(0, r.shots.findIndex((s) => time >= s.start && time < s.end));
  const shot = r.shots[index] ?? r.shots[r.shots.length - 1];
  const prev = r.shots[index - 1];
  // Paper by default: the shared visuals are drawn for it. "dark" suits the soft tech visuals.
  const tone: Tone = shot.tone ?? "light";
  const onCanvas = shot.layout === "side" || shot.layout === "media";
  // A cinematic title dims the picture a little so the line holds. No scrim, no gradient.
  const titled = shot.layout === "over" && shot.visual?.kind === "title";
  const dim = titled ? interpolate(time, [shot.start, shot.start + 0.6, shot.end - 0.5, shot.end], [1, 0.62, 0.62, 1], clamp) : 1;

  return (
    <AbsoluteFill style={{ background: "#0E0E0D" }}>
      {onCanvas && <SceneCanvas tone={tone} time={time} width={WW} height={WH} />}
      {r.shots.map((head, i) => {
        const visual = head.visual;
        if (!visual || head.keep) return null;
        let last = i;
        while (r.shots[last + 1]?.keep) last++;
        const s = { ...head, end: r.shots[last].end };
        const from = Math.round(s.start * r.fps);
        const dur = Math.max(1, Math.round(s.end * r.fps) - from);
        if (s.layout === "cutaway")
          return (
            <Sequence key={i} from={from} durationInFrames={dur} premountFor={15} name={`${i + 1} cutaway`}>
              <VisualView slug={r.slug} shot={s} time={time} w={WW} h={WH} v={visual} bleed />
            </Sequence>
          );
        if (s.layout !== "side" && s.layout !== "media") return null;
        const area = s.layout === "side" ? SIDE : MEDIA;
        const p = reveal(time, s.start, 0.5);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={15} name={`${i + 1} ${s.layout} ${visual.kind}`}>
            <div style={{ position: "absolute", left: area.x, top: area.y, width: area.w, height: area.h, display: "flex", alignItems: "center", justifyContent: "center", opacity: p, filter: `blur(${(1 - p) * 10}px)`, color: pal(tone).ink }}>
              <VisualView slug={r.slug} shot={s} time={time} w={area.w} h={area.h} v={visual} />
            </div>
          </Sequence>
        );
      })}
      <Speaker r={r} shot={shot} prev={prev} time={time} dim={dim} />
      {shot.layout === "over" && shot.visual?.kind === "lower" && <Lower title={shot.visual.title} sub={shot.visual.sub} shot={shot} time={time} />}
      {titled && shot.visual?.kind === "title" && <OverTitle text={shot.visual.text} kicker={shot.visual.kicker} shot={shot} time={time} />}
      {r.captions && <Captions chunk={r.chunks.find((c) => time >= c.start && time < c.end)} />}
      {r.audio && <Audio src={staticFile(r.audio)} />}
    </AbsoluteFill>
  );
};

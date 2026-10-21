import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./Captions";
import { Speaker } from "./Speaker";
import { clamp, ease, HEADER, MEDIA, splitGeom, t, W, H } from "./theme";
import { Accented, VisualView } from "./Visuals";
import { funnelCardBox, gridTileBox, headlineSize, pal, SCENE, SceneCanvas, SoftAccented, typeInputBox, type Box } from "./soft";
import { cameraEase, TRANSITION } from "./camera";
import type { Resolved, ResolvedShot } from "./schema";

// The header is large on the first shot (the on-screen hook in frame 1), then docks small.
const headerSize = (first: boolean) => (first ? { font: 72, height: 190 } : { font: 48, height: 104 });

const panel = (s: ResolvedShot, r: Resolved, first: boolean) => {
  if (s.layout === "scene") return s.header ? { top: SCENE.top, height: SCENE.bottom - SCENE.top } : { top: 200, height: SCENE.bottom - 200 };
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

// Header text as words, with an *accent* group kept as one word.
const headerWords = (text: string) =>
  text.split(/(\*[^*]+\*)/).flatMap((part) => (part.startsWith("*") ? [part] : part.split(/\s+/).filter(Boolean)));

const Header: React.FC<{ text: string; first: boolean; time: number; start: number; animate: boolean }> = ({ text, first, time, start, animate }) => {
  const size = headerSize(first);
  // Visible from the very first frame; it only settles a few pixels as it lands.
  const settle = interpolate(time, [start, start + 0.3], [10, 0], { ...clamp, easing: ease });
  // A new header after the first comes in word by word out of a blur.
  const word = (i: number) => (animate ? interpolate(time, [start + i * 0.07, start + i * 0.07 + 0.4], [0, 1], { ...clamp, easing: ease }) : 1);
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
        {headerWords(text).map((wd, i) => {
          const p = word(i);
          return (
            <React.Fragment key={i}>
              {i > 0 && " "}
              <span style={{ display: "inline-block", opacity: p, filter: `blur(${(1 - p) * 14}px)`, translate: `0 ${(1 - p) * 18}px` }}>
                <Accented text={wd} />
              </span>
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};

// The scene headline: large, centred, words arriving out of a blur. When it swaps mid-scene
// ("One *plans*" to "Another *builds*") the old line dissolves into a blur as the new one lands.
const SceneHeader: React.FC<{ text: string; prev?: string; tone: "light" | "dark"; time: number; start: number; animate: boolean }> = ({ text, prev, tone, time, start, animate }) => {
  const c = pal(tone);
  // Each line is sized from its own text, so the outgoing line never rewraps as it dissolves.
  const sizeOf = headlineSize;
  const line = (words: string[], p: (i: number) => number, key: string, size: number) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top: SCENE.headTop,
        height: SCENE.headHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontFamily: t.sans,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 0.98,
        letterSpacing: -size * 0.04,
        color: c.ink,
        textWrap: "balance",
      }}
    >
      <span>
        {words.map((wd, i) => {
          const q = p(i);
          return (
            <React.Fragment key={i}>
              {i > 0 && " "}
              <span style={{ display: "inline-block", opacity: q, filter: `blur(${(1 - q) * 18}px)`, translate: `0 ${(1 - q) * 22}px` }}>
                <SoftAccented text={wd} c={c} />
              </span>
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
  const out = prev ? 1 - interpolate(time, [start, start + 0.22], [0, 1], clamp) : 0;
  return (
    <>
      {prev && out > 0 && line(headerWords(prev), () => out, "prev", sizeOf(prev))}
      {line(headerWords(text), (i) => !animate ? 1 : interpolate(time, [start + 0.06 + i * 0.08, start + 0.06 + i * 0.08 + 0.5], [0, 1], { ...clamp, easing: ease }), "now", sizeOf(text))}
    </>
  );
};

// One scene, whole: its canvas, its visual (carried across kept shots) and its headline.
// Drawn as a layer so a shared-element transition can lay the next scene over the last one.
const SceneLayer: React.FC<{ r: Resolved; i: number; time: number; grade: string }> = ({ r, i, time, grade }) => {
  const shot = r.shots[i];
  let head = i;
  while (head > 0 && r.shots[head].keep) head--;
  let last = head;
  while (r.shots[last + 1]?.keep) last++;
  const s = { ...r.shots[head], end: r.shots[last].end };
  const tone = shot.tone ?? "light";
  let since = i;
  while (since > 0 && r.shots[since - 1].header === shot.header) since--;
  const from = Math.round(s.start * r.fps);
  // A little longer than the scene, so it can sit under the next scene while that one grows in.
  const dur = Math.max(1, Math.round(s.end * r.fps) - from) + Math.round(TRANSITION * r.fps) + 1;
  const box = panel(s, r, head === 0);
  return (
    <AbsoluteFill>
      <SceneCanvas tone={tone} time={time} />
      {s.visual && (
        <Sequence from={from} durationInFrames={dur} name={`${head + 1} scene ${s.visual.kind}`}>
          <div style={{ position: "absolute", left: 60, width: W - 120, top: box.top, height: box.height, display: "flex", alignItems: "center", justifyContent: "center", color: pal(tone).ink }}>
            <VisualView slug={r.slug} shot={s} time={time} w={W - 120} h={box.height} v={s.visual} filter={grade} />
          </div>
        </Sequence>
      )}
      {shot.header && (
        <SceneHeader
          text={shot.header}
          prev={since > 0 && r.shots[since - 1].layout === "scene" && !shot.enter ? r.shots[since - 1].header : undefined}
          tone={tone}
          time={time}
          start={r.shots[since].start}
          animate={since > 0}
        />
      )}
    </AbsoluteFill>
  );
};

// Where a shared element sits in the previous scene, in frame pixels.
const enterBox = (r: Resolved, i: number): Box | undefined => {
  const e = r.shots[i].enter;
  if (!e) return undefined;
  if (e.from === "rect" && e.rect) return { x: e.rect[0] * W, y: e.rect[1] * H, w: e.rect[2] * W, h: e.rect[3] * H, r: 24 };
  let head = i - 1;
  while (head > 0 && r.shots[head].keep) head--;
  let last = head;
  while (r.shots[last + 1]?.keep) last++;
  const s = { ...r.shots[head], end: r.shots[last].end };
  if (!s.visual || s.layout !== "scene") return undefined;
  const box = panel(s, r, head === 0);
  const w = W - 120;
  const local = e.from === "tile" ? gridTileBox(s.visual, w, box.height, e.index) : e.from === "card" ? funnelCardBox(s.visual, w, box.height) : typeInputBox(s.visual, w, box.height);
  return local && { ...local, x: local.x + 60, y: local.y + box.top };
};

// A shared-element transition: the next scene grows out of an element of the last one. The
// element's box opens to the full frame while the scene inside scales up from that box, both on
// the one camera curve.
const Grow: React.FC<{ b: Box; p: number; children: React.ReactNode }> = ({ b, p, children }) => {
  const k0 = Math.max(b.w / W, b.h / H);
  const k = k0 + (1 - k0) * p;
  const q = 1 - p;
  return (
    <AbsoluteFill style={{ clipPath: `inset(${b.y * q}px ${(W - b.x - b.w) * q}px ${(H - b.y - b.h) * q}px ${b.x * q}px round ${b.r * q}px)` }}>
      <AbsoluteFill style={{ transform: `translate(${(b.x + b.w / 2 - W / 2) * q}px, ${(b.y + b.h / 2 - H / 2) * q}px) scale(${k})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Reel: React.FC<Resolved> = (r) => {
  const frame = useCurrentFrame();
  const time = frame / r.fps;
  const index = Math.max(0, r.shots.findIndex((s) => time >= s.start && time < s.end));
  const shot = r.shots[index] ?? r.shots[r.shots.length - 1];
  const grade = `brightness(${r.grade.brightness}) contrast(${r.grade.contrast}) saturate(${r.grade.saturate})`;
  const onCanvas = shot.layout === "split" || shot.layout === "media";
  // The header animates from the shot where its text last changed.
  let since = index;
  while (since > 0 && r.shots[since - 1].header === shot.header) since--;

  const scene = shot.layout === "scene";
  // A shot that enters through a shared element grows out of the scene before it.
  const grow = scene && shot.enter && index > 0 && time < shot.start + TRANSITION ? enterBox(r, index) : undefined;

  return (
    <AbsoluteFill style={{ background: t.canvas }}>
      {onCanvas && <Canvas />}
      <Speaker r={r} shot={shot} time={time} />
      {scene &&
        (grow ? (
          <>
            <SceneLayer r={r} i={index - 1} time={time} grade={grade} />
            <Grow b={grow} p={cameraEase(Math.min(1, (time - shot.start) / TRANSITION))}>
              <SceneLayer r={r} i={index} time={time} grade={grade} />
            </Grow>
          </>
        ) : (
          <SceneLayer r={r} i={index} time={time} grade={grade} />
        ))}

      {/* Darken the bottom of speaker shots slightly so white captions hold. */}
      {(shot.layout === "full" || shot.layout === "punch") && (
        <AbsoluteFill style={{ background: "linear-gradient(transparent 35%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.3))" }} />
      )}

      {r.shots.map((head, i) => {
        // A kept shot carries on the visual of the shot before it, so one scene runs across them.
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
              <AbsoluteFill>
                <VisualView slug={r.slug} shot={s} time={time} w={W} h={H} v={visual} filter={grade} bleed />
                <AbsoluteFill style={{ background: "linear-gradient(transparent 55%, rgba(0,0,0,0.35) 80%, rgba(0,0,0,0.5))" }} />
              </AbsoluteFill>
            </Sequence>
          );
        if (s.layout !== "split" && s.layout !== "media") return null;
        const box = panel(s, r, i === 0);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={15} name={`${i + 1} ${s.layout} ${visual.kind}`}>
            <div style={{ position: "absolute", left: 60, width: W - 120, top: box.top, height: box.height, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <VisualView slug={r.slug} shot={s} time={time} w={W - 120} h={box.height} v={visual} filter={grade} />
            </div>
          </Sequence>
        );
      })}

      {onCanvas && shot.header && <Header text={shot.header} first={index === 0} time={time} start={r.shots[since].start} animate={since > 0} />}
      <Captions r={r} shot={shot} time={time} />
      {r.audio && <Audio src={staticFile(r.audio)} />}
    </AbsoluteFill>
  );
};


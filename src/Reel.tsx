import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./Captions";
import { Speaker } from "./Speaker";
import { clamp, ease, HEADER, MEDIA, splitGeom, t, W, H } from "./theme";
import { Accented, VisualView } from "./Visuals";
import { pal, SCENE, SceneCanvas, SoftAccented } from "./soft";
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
const SceneHeader: React.FC<{ text: string; prev?: string; tone: "light" | "dark"; time: number; start: number }> = ({ text, prev, tone, time, start }) => {
  const c = pal(tone);
  const size = text.replace(/\*/g, "").length > 22 ? 84 : 100;
  const line = (words: string[], p: (i: number) => number, key: string) => (
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
        lineHeight: 1.02,
        letterSpacing: -size * 0.035,
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
      {prev && out > 0 && line(headerWords(prev), () => out, "prev")}
      {line(headerWords(text), (i) => interpolate(time, [start + 0.06 + i * 0.08, start + 0.06 + i * 0.08 + 0.5], [0, 1], { ...clamp, easing: ease }), "now")}
    </>
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

  // A scene's canvas starts where its visual started, so a kept scene's glow carries on unbroken.
  let head = index;
  while (head > 0 && r.shots[head].keep) head--;
  const scene = shot.layout === "scene";
  const tone = shot.tone ?? "light";

  return (
    <AbsoluteFill style={{ background: t.canvas }}>
      {onCanvas && <Canvas />}
      {scene && <SceneCanvas tone={tone} time={time} start={r.shots[head].start} />}
      <Speaker r={r} shot={shot} time={time} />

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
        if (s.layout !== "split" && s.layout !== "media" && s.layout !== "scene") return null;
        const box = panel(s, r, i === 0);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} premountFor={15} name={`${i + 1} ${s.layout} ${visual.kind}`}>
            <div style={{ position: "absolute", left: 60, width: W - 120, top: box.top, height: box.height, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <VisualView slug={r.slug} shot={s} time={time} w={W - 120} h={box.height} v={visual} filter={grade} />
            </div>
          </Sequence>
        );
      })}

      {scene && shot.header && (
        <SceneHeader text={shot.header} prev={since > 0 && r.shots[since - 1].layout === "scene" ? r.shots[since - 1].header : undefined} tone={tone} time={time} start={r.shots[since].start} />
      )}
      {onCanvas && shot.header && <Header text={shot.header} first={index === 0} time={time} start={r.shots[since].start} animate={since > 0} />}
      <Captions r={r} shot={shot} time={time} />
      {r.audio && <Audio src={staticFile(r.audio)} />}
    </AbsoluteFill>
  );
};


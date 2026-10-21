import React from "react";
import { Video } from "@remotion/media";
import { interpolate, staticFile } from "remotion";
import { clamp, H, splitGeom, W, type Box } from "./theme";
import type { Resolved, ResolvedShot } from "./schema";

const FULL: Box = { left: 0, top: 0, width: W, height: H, radius: 0 };

// Where the speaker sits, and how big the face should be, in each layout.
const framing = (layout: ResolvedShot["layout"], r: Resolved): { box: Box; faceH: number; faceAt: number; visible: boolean } => {
  switch (layout) {
    case "split": {
      const inset = r.split === "inset";
      return { box: splitGeom(r.split).speaker, faceH: inset ? 0.62 : 0.6, faceAt: inset ? 0.48 : 0.4, visible: true };
    }
    case "punch":
      // Punch is always visibly tighter than full: at least 1.25x the full framing.
      return { box: FULL, faceH: Math.max(0.5, r.face.h * Math.max(W / r.videoSize[0], H / r.videoSize[1]) * (r.videoSize[1] / H) * 1.25), faceAt: 0.3, visible: true };
    case "media":
    case "cutaway":
      return { box: FULL, faceH: 0, faceAt: 0, visible: false };
    default:
      return { box: FULL, faceH: 0, faceAt: 0, visible: true };
  }
};

// Stands in for the speaker in script projects (no footage): a head and shoulders in a dim room,
// drawn in a 1080x1920 frame with the face where PLACEHOLDER_FACE in tools/cli.ts says it is.
const Placeholder: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <svg viewBox="0 0 1080 1920" preserveAspectRatio="none" style={style}>
    <defs>
      <radialGradient id="room" cx="0.5" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#4A4740" />
        <stop offset="1" stopColor="#23221F" />
      </radialGradient>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6B665D" />
        <stop offset="1" stopColor="#3A3833" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#room)" />
    <path d="M150 1920 C150 1180 330 1010 540 1010 C750 1010 930 1180 930 1920 Z" fill="url(#body)" />
    <rect x="470" y="820" width="140" height="220" rx="60" fill="#5E5A52" />
    <ellipse cx="540" cy="576" rx="128" ry="163" fill="#77726A" />
  </svg>
);

// One continuous speaker video. It is never unmounted, so playback never seeks
// between shots; each layout only changes its box and framing.
export const Speaker: React.FC<{ r: Resolved; shot: ResolvedShot; time: number }> = ({ r, shot, time }) => {
  const [sw, sh] = r.videoSize;
  const f = framing(shot.layout, r);
  let box = f.box;
  const inset = shot.layout === "split" && r.split === "inset";
  // Scale so the head fills `faceH` of the box, but never so small the video stops covering the box.
  const faceScale = f.faceH ? (f.faceH * box.height) / (r.face.h * sh) : 0;
  if (inset && faceScale && faceScale < Math.max(box.width / sw, box.height / sh)) {
    // Tight footage: narrow the window to fit the whole head instead of cropping it.
    const width = Math.max(box.height * 0.8, sw * faceScale);
    box = { ...box, left: box.left + (box.width - width) / 2, width };
  }
  const cover = Math.max(box.width / sw, box.height / sh);
  const base = Math.max(cover, faceScale);
  // Every shot moves: a slow push-in across the shot.
  const progress = interpolate(time, [shot.start, shot.end], [0, 1], clamp);
  const scale = base * (1 + 0.035 * progress);
  const vw = sw * scale;
  const vh = sh * scale;
  // Put the face centre at the target point in the box, without exposing the edges.
  // Full shots keep a portrait source's own framing; landscape footage puts the face a third down.
  const naturalY = sw > sh ? 0.36 : r.face.y;
  const anchorY = box.height * (f.faceH ? f.faceAt : naturalY);
  let x = box.width / 2 - r.face.x * vw;
  let y = anchorY - r.face.y * vh;
  x = Math.min(0, Math.max(box.width - vw, x));
  y = Math.min(0, Math.max(box.height - vh, y));

  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        overflow: "hidden",
        // The half split is open at the bottom edge; the inset is a rounded window on all sides.
        borderRadius: inset ? box.radius : `${box.radius}px ${box.radius}px 0 0`,
        boxShadow: inset ? "0 18px 50px rgba(20,20,30,0.18)" : "none",
        opacity: f.visible ? 1 : 0,
      }}
    >
      {r.video ? (
        <Video
          src={staticFile(r.video)}
          muted={!!r.audio}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width: vw,
            height: vh,
            filter: `brightness(${r.grade.brightness}) contrast(${r.grade.contrast}) saturate(${r.grade.saturate})`,
          }}
        />
      ) : (
        <Placeholder style={{ position: "absolute", left: x, top: y, width: vw, height: vh }} />
      )}
    </div>
  );
};

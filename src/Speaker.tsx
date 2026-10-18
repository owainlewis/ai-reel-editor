import React from "react";
import { Video } from "@remotion/media";
import { interpolate, staticFile } from "remotion";
import { clamp, H, SPLIT, W } from "./theme";
import type { Resolved, ResolvedShot } from "./schema";

type Box = { top: number; height: number; radius: number };

// Where the speaker sits, and how big the face should be, in each layout.
const framing = (layout: ResolvedShot["layout"]): { box: Box; faceH: number; faceAt: number; visible: boolean } => {
  switch (layout) {
    case "split":
      return { box: { top: SPLIT.speakerTop, height: H - SPLIT.speakerTop, radius: 40 }, faceH: 0.55, faceAt: 0.42, visible: true };
    case "punch":
      return { box: { top: 0, height: H, radius: 0 }, faceH: 0.5, faceAt: 0.3, visible: true };
    case "media":
      return { box: { top: 0, height: H, radius: 0 }, faceH: 0, faceAt: 0, visible: false };
    default:
      return { box: { top: 0, height: H, radius: 0 }, faceH: 0, faceAt: 0, visible: true };
  }
};

// One continuous speaker video. It is never unmounted, so playback never seeks
// between shots; each layout only changes its box and framing.
export const Speaker: React.FC<{ r: Resolved; shot: ResolvedShot; time: number }> = ({ r, shot, time }) => {
  const f = framing(shot.layout);
  const { box } = f;
  // Scale so the face fills `faceH` of the box. Never below 1, so the video always covers the frame width.
  const faceScale = f.faceH ? (f.faceH * box.height) / (r.face.h * H) : 0;
  const base = Math.max(1, faceScale);
  // Every shot moves: a slow push-in across the shot.
  const progress = interpolate(time, [shot.start, shot.end], [0, 1], clamp);
  const scale = base * (1 + 0.035 * progress);
  const vw = W * scale;
  const vh = H * scale;
  // Put the face centre at the target point in the box, without exposing the edges.
  const anchorY = f.faceH ? box.height * f.faceAt : box.height * (r.face.y);
  let x = W / 2 - r.face.x * vw;
  let y = anchorY - r.face.y * vh;
  x = Math.min(0, Math.max(W - vw, x));
  y = Math.min(0, Math.max(box.height - vh, y));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: box.top,
        width: W,
        height: box.height,
        overflow: "hidden",
        borderTopLeftRadius: box.radius,
        borderTopRightRadius: box.radius,
        opacity: f.visible ? 1 : 0,
      }}
    >
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
    </div>
  );
};

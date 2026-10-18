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
      return { box: splitGeom(r.split).speaker, faceH: inset ? 0.8 : 0.55, faceAt: inset ? 0.5 : 0.42, visible: true };
    }
    case "punch":
      return { box: FULL, faceH: 0.5, faceAt: 0.3, visible: true };
    case "media":
    case "cutaway":
      return { box: FULL, faceH: 0, faceAt: 0, visible: false };
    default:
      return { box: FULL, faceH: 0, faceAt: 0, visible: true };
  }
};

// One continuous speaker video. It is never unmounted, so playback never seeks
// between shots; each layout only changes its box and framing.
export const Speaker: React.FC<{ r: Resolved; shot: ResolvedShot; time: number }> = ({ r, shot, time }) => {
  const f = framing(shot.layout, r);
  const { box } = f;
  // Scale so the face fills `faceH` of the box, but never so small the video stops covering the box.
  const cover = Math.max(box.width / W, box.height / H);
  const faceScale = f.faceH ? (f.faceH * box.height) / (r.face.h * H) : 0;
  const base = Math.max(cover, faceScale);
  // Every shot moves: a slow push-in across the shot.
  const progress = interpolate(time, [shot.start, shot.end], [0, 1], clamp);
  const scale = base * (1 + 0.035 * progress);
  const vw = W * scale;
  const vh = H * scale;
  // Put the face centre at the target point in the box, without exposing the edges.
  const anchorY = f.faceH ? box.height * f.faceAt : box.height * r.face.y;
  let x = box.width / 2 - r.face.x * vw;
  let y = anchorY - r.face.y * vh;
  x = Math.min(0, Math.max(box.width - vw, x));
  y = Math.min(0, Math.max(box.height - vh, y));
  const inset = shot.layout === "split" && r.split === "inset";

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

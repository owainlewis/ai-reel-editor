import React from "react";
import { H, MEDIA, splitGeom, t } from "./theme";
import { pal, SCENE } from "./soft";
import type { Chunk, Resolved, ResolvedShot } from "./schema";

const clean = (s: string) => s.replace(/^["“'(]+|["”,.;:)]+$/g, "");

// Captions hard-swap, with no pop, and appear two frames before the first word
// (the timing is set in tools/resolve.ts). Their look depends on what is behind them:
// ink on the canvas, white with a soft shadow on the speaker, large serif on full visuals.
export const Captions: React.FC<{ r: Resolved; shot: ResolvedShot; time: number }> = ({ r, shot, time }) => {
  const chunk: Chunk | undefined = r.chunks.find((c) => time >= c.start && time < c.end);
  if (!chunk) return null;

  // In the 50/50 split the caption sits on the speaker's half; in the inset it sits on the canvas seam.
  const onCanvas = shot.layout === "media" || (shot.layout === "split" && r.split === "inset");
  const serifAll = shot.layout === "media";
  // On a scene the headline leads; the caption sits low and quieter, in the scene's ink.
  const scene = shot.layout === "scene";
  const c = pal(shot.tone);
  // On the speaker the caption sits on the chest, below the chin and clear of the mouth.
  // face.h is the head's height, so the chin sits half of it below the centre.
  // Landscape footage is framed with the face a third down (see Speaker), portrait keeps its own framing.
  const faceY = r.videoSize[0] > r.videoSize[1] ? 0.36 : r.face.y;
  const chin = (faceY + r.face.h * 0.5) * H;
  const y =
    shot.layout === "split"
      ? splitGeom(r.split).seam
      : scene
        ? SCENE.caption
        : shot.layout === "media"
        ? MEDIA.caption
        : shot.layout === "cutaway"
          ? 1480
          : shot.layout === "punch"
          ? Math.min(H - 420, (0.3 + 0.5 * 0.5) * H + 110)
          : Math.min(H - 420, chin + 170);

  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: y,
        translate: "0 -50%",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        gap: "0 20px",
        textAlign: "center",
      }}
    >
      {chunk.words.map((w, i) => {
        const serif = w.accent || serifAll;
        return (
          <span
            key={i}
            style={{
              fontFamily: serif ? t.serif : t.sans,
              fontStyle: serif ? "italic" : "normal",
              fontWeight: serif ? 400 : 700,
              fontSize: scene ? (serif ? 70 : 56) : serifAll ? 108 : serif ? 92 : 74,
              letterSpacing: serif ? -0.5 : scene ? -1 : -1.8,
              lineHeight: 1.04,
              color: scene ? (serif ? c.accent : c.ink) : onCanvas ? t.ink : "#FFFFFF",
              opacity: scene && !serif ? 0.82 : 1,
              textShadow: onCanvas || scene ? "none" : "0 2px 18px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {clean(w.text)}
          </span>
        );
      })}
    </div>
  );
};

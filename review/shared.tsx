import React, { useEffect } from "react";
import type { Resolved } from "../src/schema";

// A script project has no mixed audio until it is rendered; play its voice so the board is never silent.
export const playable = (r: Resolved): Resolved => (r.audio || r.video ? r : { ...r, audio: `${r.slug}/source/voice.wav` });

export const frames = (r: Resolved) => Math.max(1, Math.round(r.duration * r.fps));

// Text with *one accent* in Signifier italic, as in the reels.
export const Accented: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*[^*]+\*)/).map((part, i) =>
      part.startsWith("*") ? (
        <span key={i} className="accent">
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

// Calls back when the server sees a reel's plan or renders change.
export const usePlanEvents = (on: (slug: string) => void) => {
  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => on(JSON.parse(e.data).slug);
    return () => es.close();
  }, [on]);
};

export const ago = (ms: number) => {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};

export const secs = (t: number) => `${t.toFixed(1)}s`;

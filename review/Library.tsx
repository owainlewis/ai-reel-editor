import React, { useCallback, useEffect, useState } from "react";
import { Thumbnail } from "@remotion/player";
import { Reel } from "../src/Reel";
import type { Resolved } from "../src/schema";
import type { Status } from "./model";
import { Accented, ago, frames, playable, secs, usePlanEvents } from "./shared";

type Row = {
  slug: string;
  title: string;
  validated: boolean;
  duration?: number;
  shots?: number;
  counts?: Record<Status, number>;
  statuses?: Status[];
  render: { file: string; at: number } | null;
  resolved?: Resolved;
};

// Every project in projects/, newest first.
export const Library: React.FC = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const load = useCallback(() => void fetch("/api/projects").then((r) => r.json()).then(setRows), []);
  useEffect(load, [load]);
  usePlanEvents(load);

  return (
    <div className="library">
      <div className="masthead">
        <h1>
          Review <span className="accent">board</span>
        </h1>
        <span className="muted">{rows ? `${rows.length} reels` : ""}</span>
      </div>
      {rows && !rows.length && <div className="empty">No projects yet. Make one with npm run reel -- script or new.</div>}
      <div className="grid">
        {rows?.map((p) => (
          <div key={p.slug} className="reel-tile" role="link" onClick={() => p.validated && (location.hash = `#/reel/${encodeURIComponent(p.slug)}`)}>
            <div className="thumb">
              {p.resolved && (
                <Thumbnail
                  component={Reel}
                  inputProps={playable(p.resolved)}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  durationInFrames={frames(p.resolved)}
                  fps={p.resolved.fps}
                  frameToDisplay={Math.min(frames(p.resolved) - 1, 20)}
                  style={{ height: "100%", aspectRatio: "9 / 16" }}
                />
              )}
            </div>
            <div className="meta">
              <h2>
                <Accented text={p.title} />
              </h2>
              <div className="mono">{p.slug}</div>
              {p.validated ? (
                <>
                  <div className="facts">
                    <span>{secs(p.duration ?? 0)}</span>
                    <span>{p.shots} shots</span>
                    <span>
                      {p.counts?.approved} approved · {p.counts?.change} to change · {p.counts?.waiting} waiting
                    </span>
                  </div>
                  <div className="strip">
                    {p.statuses?.map((s, i) => <span key={i} className={`seg ${s}`} style={{ cursor: "inherit" }} />)}
                  </div>
                </>
              ) : (
                <div className="facts">Not validated yet</div>
              )}
              <div className="facts" style={{ marginBottom: 0 }}>
                {p.render ? (
                  <span onClick={(e) => e.stopPropagation()}>
                    Latest render{" "}
                    <a href={`/${p.render.file}`} target="_blank" rel="noreferrer">
                      {p.render.file.split("/").pop()}
                    </a>{" "}
                    {ago(p.render.at)}
                  </span>
                ) : (
                  <span>No render yet</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

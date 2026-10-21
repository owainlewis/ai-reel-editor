import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";

import type { Resolved } from "../src/schema";
import type { Review, ShotInfo, Status } from "./model";
import { Accented, frames, playable, secs, stage, usePlanEvents } from "./shared";

type Data = { resolved: Resolved; shots: ShotInfo[]; review: Review; reel: string };

const statusLabel: Record<Status, string> = { approved: "Approved", change: "Change", waiting: "Waiting" };

// One reel's board: the full reel on the left, a card per shot on the right.
// Every click and keystroke saves to projects/<slug>/review.json.
export const Board: React.FC<{ slug: string }> = ({ slug }) => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(0);
  const [now, setNow] = useState(-1);
  const [focus, setFocus] = useState(0);
  const main = useRef<PlayerRef>(null);

  const load = useCallback(
    () =>
      fetch(`/api/reel/${encodeURIComponent(slug)}`)
        .then(async (r) => (r.ok ? setData(await r.json()) : setError((await r.json()).error)))
        .catch((e) => setError(String(e))),
    [slug],
  );
  useEffect(() => void load(), [load]);
  usePlanEvents(useCallback((s: string) => s === slug && void load(), [slug, load]));

  const put = useCallback(
    async (path: string, body: unknown) => {
      setSaving((n) => n + 1);
      try {
        const r = await fetch(`/api/reel/${encodeURIComponent(slug)}/${path}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (r.status === 409) return void load();
        if (r.ok) {
          const { review } = await r.json();
          setData((d) => (d ? { ...d, review } : d));
        }
      } finally {
        setSaving((n) => n - 1);
      }
    },
    [slug, load],
  );

  const setShot = useCallback(
    (s: ShotInfo, patch: { status?: Status; comment?: string }) => {
      // Show the new status at once; the server's copy replaces it when it answers.
      setData((d) => (d ? { ...d, review: { ...d.review, shots: { ...d.review.shots, [s.id]: { ...d.review.shots[s.id], ...patch } } } } : d));
      return put(`shot/${encodeURIComponent(s.id)}`, { hash: s.hash, ...patch });
    },
    [put],
  );

  // Which shot the full reel is on.
  useEffect(() => {
    const p = main.current;
    if (!p || !data) return;
    const on = (e: { detail: { frame: number } }) => {
      const t = e.detail.frame / data.resolved.fps;
      setNow(data.shots.findIndex((s) => t >= s.start && t < s.end));
    };
    p.addEventListener("frameupdate", on);
    return () => p.removeEventListener("frameupdate", on);
  }, [data]);

  const jump = (i: number) => {
    setFocus(i);
    document.getElementById(`shot-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const playInReel = (s: ShotInfo) => {
    main.current?.seekTo(Math.round(s.start * (data?.resolved.fps ?? 30)));
    main.current?.play();
  };

  // Keys: j / k move between shots, a approves, c asks for a change, n jumps to the next shot waiting.
  useEffect(() => {
    if (!data) return;
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) {
        if (e.key === "Escape") el.blur();
        return;
      }
      const s = data.shots[focus];
      if (e.key === "j") jump(Math.min(data.shots.length - 1, focus + 1));
      else if (e.key === "k") jump(Math.max(0, focus - 1));
      else if (e.key === "a" && s) {
        void setShot(s, { status: "approved" });
        jump(Math.min(data.shots.length - 1, focus + 1));
      } else if (e.key === "c" && s) {
        e.preventDefault();
        void setShot(s, { status: "change" });
        document.querySelector<HTMLTextAreaElement>(`#shot-${focus} textarea`)?.focus();
      } else if (e.key === "n") nextWaiting();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  const nextWaiting = () => {
    if (!data) return;
    const order = [...data.shots.slice(focus + 1), ...data.shots.slice(0, focus + 1)];
    const next = order.find((s) => (data.review.shots[s.id]?.status ?? "waiting") === "waiting");
    if (next) jump(next.n - 1);
  };

  const counts = useMemo(() => {
    const c = { approved: 0, change: 0, waiting: 0 };
    for (const s of data?.shots ?? []) c[data!.review.shots[s.id]?.status ?? "waiting"]++;
    return c;
  }, [data]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="error muted">Loading…</div>;
  const r = playable(data.resolved);
  const total = frames(r);

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-row">
            <a className="back" href="#/">
              ← Reels
            </a>
            <h1>
              <Accented text={data.resolved.title} />
            </h1>
            <div className="counts">
              <span>
                <i className="dot approved" /> {counts.approved} approved
              </span>
              <span>
                <i className="dot change" /> {counts.change} to change
              </span>
              <span>
                <i className="dot waiting" /> {counts.waiting} waiting
              </span>
            </div>
            <button className="ghost" onClick={nextWaiting} disabled={!counts.waiting}>
              Next waiting ↓
            </button>
            <span className="saved">{saving ? "Saving…" : "Saved"}</span>
          </div>
          <div className="strip">
            {data.shots.map((s, i) => (
              <button
                key={s.id}
                className={`seg ${data.review.shots[s.id]?.status ?? "waiting"} ${i === now ? "now" : ""}`}
                style={{ flexGrow: s.end - s.start }}
                title={`#${s.n} ${s.words || s.anchor}`}
                onClick={() => jump(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={`board ${stage(r).wide ? "wide" : ""}`}>
        <aside className="side">
          <div className="main-player">
            <Player
              ref={main}
              component={stage(r).component}
              inputProps={r}
              durationInFrames={total}
              compositionWidth={stage(r).compositionWidth}
              compositionHeight={stage(r).compositionHeight}
              fps={r.fps}
              controls
              style={{ width: "100%", aspectRatio: stage(r).aspect }}
            />
          </div>
          <Notes key={data.reel} review={data.review} onSave={(text) => put("notes", { text })} />
          <div className="keys">
            <kbd>j</kbd> <kbd>k</kbd> move · <kbd>a</kbd> approve · <kbd>c</kbd> change · <kbd>n</kbd> next waiting · <kbd>esc</kbd> out of a note
          </div>
        </aside>

        <main className="cards">
          {data.shots.map((s, i) => (
            // Keyed by hash: a shot Claude changed comes back as a fresh card.
            <ShotCard
              key={`${s.id}:${s.hash}`}
              i={i}
              shot={s}
              r={r}
              review={data.review.shots[s.id]}
              now={i === now}
              onFocus={() => setFocus(i)}
              onSet={(patch) => setShot(s, patch)}
              onPlay={() => playInReel(s)}
            />
          ))}
        </main>
      </div>
    </>
  );
};

// Saves a text field a moment after typing stops, and on blur.
const useAutosave = (initial: string, save: (v: string) => void) => {
  const [value, setValue] = useState(initial);
  const last = useRef(initial);
  const timer = useRef<number>(undefined);
  const flush = (v: string) => {
    clearTimeout(timer.current);
    if (v !== last.current) {
      last.current = v;
      save(v);
    }
  };
  const change = (v: string) => {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => flush(v), 500);
  };
  return { value, change, blur: () => flush(value) };
};

const Notes: React.FC<{ review: Review; onSave: (text: string) => void }> = ({ review, onSave }) => {
  const notes = useAutosave(review.notes.text, onSave);
  const past = review.notesHistory.at(-1);
  return (
    <div>
      <p className="label">Whole reel</p>
      <textarea placeholder="Notes on the whole reel: pacing, music, the hook…" value={notes.value} onChange={(e) => notes.change(e.target.value)} onBlur={notes.blur} />
      {past && (
        <div className="history">
          Before the last change: <q>{past.text}</q>
        </div>
      )}
    </div>
  );
};

const ShotCard: React.FC<{
  i: number;
  shot: ShotInfo;
  r: Resolved;
  review?: Review["shots"][string];
  now: boolean;
  onFocus: () => void;
  onSet: (patch: { status?: Status; comment?: string }) => Promise<void>;
  onPlay: () => void;
}> = ({ i, shot: s, r, review, now, onFocus, onSet, onPlay }) => {
  const status = review?.status ?? "waiting";
  const comment = useAutosave(review?.comment ?? "", (comment) => {
    // Writing a note on a shot is asking for a change.
    void onSet(comment.trim() && status === "waiting" ? { comment, status: "change" } : { comment });
  });
  const ref = useRef<HTMLDivElement>(null);
  const player = useRef<PlayerRef>(null);
  const note = useRef<HTMLTextAreaElement>(null);
  const from = Math.round(s.start * r.fps);
  const to = Math.max(from, Math.round(s.end * r.fps) - 1);
  const past = review?.history.filter((h) => h.comment).at(-1);

  // Loop the shot only while its card is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? player.current?.play() : player.current?.pause()), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggle = (next: Status) => {
    const set = status === next ? "waiting" : next;
    void onSet({ status: set });
    if (set === "change") setTimeout(() => note.current?.focus(), 0);
  };

  return (
    <section id={`shot-${i}`} className={`card ${status} ${now ? "now" : ""}`} onMouseDown={onFocus} onFocus={onFocus}>
      <div className="shot-player" ref={ref}>
        <Player
          ref={player}
          component={stage(r).component}
          inputProps={r}
          durationInFrames={frames(r)}
          compositionWidth={stage(r).compositionWidth}
          compositionHeight={stage(r).compositionHeight}
          fps={r.fps}
          initialFrame={from}
          inFrame={from}
          outFrame={to}
          loop
          initiallyMuted
          clickToPlay
          style={{ width: "100%", aspectRatio: stage(r).aspect }}
        />
      </div>
      <div>
        <div className="card-head">
          <span className="num">{String(s.n).padStart(2, "0")}</span>
          <span className="mono">
            {s.id} · {secs(s.start)} · {secs(s.end - s.start)}
          </span>
          <span className={`pill ${status}`}>{statusLabel[status]}</span>
        </div>
        <p className={`says ${s.words ? "" : "none"}`}>{s.words ? `“${s.words}”` : "(no words)"}</p>
        {s.header && (s.layout === "split" || s.layout === "media") && (
          <div className="onscreen">
            <span className="muted">Header </span>
            <Accented text={s.header} />
          </div>
        )}
        <div className="chips">
          <span className="chip">{s.layout}</span>
          {s.kind && <span className="chip">{s.kind}</span>}
          {s.keep && <span className="chip">keeps previous visual</span>}
        </div>
        <div className="actions">
          <button className={`btn approve ${status === "approved" ? "on" : ""}`} onClick={() => toggle("approved")}>
            ✓ Approve
          </button>
          <button className={`btn change ${status === "change" ? "on" : ""}`} onClick={() => toggle("change")}>
            Change
          </button>
          <button className="link" onClick={onPlay}>
            Play in reel
          </button>
        </div>
        <textarea ref={note} placeholder="What should change?" value={comment.value} onChange={(e) => comment.change(e.target.value)} onBlur={comment.blur} rows={2} />
        {past && (
          <div className="history">
            You asked before: <q>{past.comment}</q>
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";

import { Reel } from "../src/Reel";
import { Wide } from "../src/Wide";
import type { Status } from "./model";
import type { StyleReview } from "./styles";
import type { Card } from "../styles/blueprint/style";
import { labResolved, labViews, type LabSize, type LabTone } from "../styles/blueprint/lab";
import { Accented, frames } from "./shared";

type Data = { review: StyleReview; cards: (Card & { hash: string })[] };
type Filter = "all" | "t1" | "t2" | "overlay" | "new";

const statusLabel: Record<Status, string> = { approved: "Approved", change: "Change", waiting: "Waiting" };
const viewLabel = (size: LabSize, tone: LabTone) => `${size === "split" ? "Split" : size === "full" ? "Scene" : "Over 16:9"} · ${tone}`;

// The style lab: every card in the catalog playing live with sample content, light and dark,
// split and full frame, with Approve / Change and a note per card. Saves to styles/<style>/review.json;
// `npm run reel -- styles feedback` prints the open notes.
export const StyleLab: React.FC<{ id: string }> = ({ id }) => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(
    () =>
      fetch(`/api/styles/${encodeURIComponent(id)}`)
        .then(async (r) => (r.ok ? setData(await r.json()) : setError((await r.json()).error)))
        .catch((e) => setError(String(e))),
    [id],
  );
  useEffect(() => void load(), [load]);

  const put = useCallback(
    async (path: string, body: unknown) => {
      setSaving((n) => n + 1);
      try {
        const r = await fetch(`/api/styles/${encodeURIComponent(id)}/${path}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (r.status === 409) return void load();
        if (r.ok) {
          const { review } = await r.json();
          setData((d) => (d ? { ...d, review } : d));
        }
      } finally {
        setSaving((n) => n - 1);
      }
    },
    [id, load],
  );

  const setCard = useCallback(
    (c: Card & { hash: string }, patch: { status?: Status; comment?: string }) => {
      setData((d) => (d ? { ...d, review: { ...d.review, cards: { ...d.review.cards, [c.id]: { ...d.review.cards[c.id], ...patch } } } } : d));
      return put(`card/${encodeURIComponent(c.id)}`, { hash: c.hash, ...patch });
    },
    [put],
  );

  const counts = useMemo(() => {
    const c = { approved: 0, change: 0, waiting: 0 };
    for (const card of data?.cards ?? []) c[data!.review.cards[card.id]?.status ?? "waiting"]++;
    return c;
  }, [data]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="error muted">Loading…</div>;
  const shown = data.cards.filter((c) => (filter === "all" ? true : filter === "new" ? c.added : c.tier === filter));

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-row">
            <a className="back" href="#/">
              ← Reels
            </a>
            <h1>
              Blueprint <span className="accent">style lab</span>
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
            <span className="saved">{saving ? "Saving…" : "Saved"}</span>
          </div>
          <div className="filters">
            {(["all", "t1", "t2", "overlay", "new"] as Filter[]).map((f) => (
              <button key={f} className={`ghost ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                {{ all: `All ${data.cards.length}`, t1: "t1 · full frame", t2: "t2 · beside the speaker", overlay: "Overlay", new: `New ${data.cards.filter((c) => c.added).length}` }[f]}
              </button>
            ))}
            <span className="muted lab-note">Sample content, illustration only. Real reels use real captures, logos and numbers.</span>
          </div>
        </div>
      </div>
      <div className="lab">
        <StyleNotes key={data.review.notes} text={data.review.notes} onSave={(text) => put("notes", { text })} />
        {shown.map((c) => (
          <CardRow key={`${c.id}:${c.hash}`} card={c} review={data.review.cards[c.id]} onSet={(patch) => setCard(c, patch)} />
        ))}
      </div>
    </>
  );
};

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
  return {
    value,
    change: (v: string) => {
      setValue(v);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => flush(v), 500);
    },
    blur: () => flush(value),
  };
};

const StyleNotes: React.FC<{ text: string; onSave: (t: string) => void }> = ({ text, onSave }) => {
  const notes = useAutosave(text, onSave);
  return (
    <div className="lab-notes">
      <p className="label">Whole style</p>
      <textarea placeholder="Notes on the style as a whole: palette, type, spacing, motion…" value={notes.value} onChange={(e) => notes.change(e.target.value)} onBlur={notes.blur} />
    </div>
  );
};

const CardRow: React.FC<{ card: Card; review?: StyleReview["cards"][string]; onSet: (p: { status?: Status; comment?: string }) => Promise<void> }> = ({ card, review, onSet }) => {
  const status = review?.status ?? "waiting";
  const comment = useAutosave(review?.comment ?? "", (comment) => void onSet(comment.trim() && status === "waiting" ? { comment, status: "change" } : { comment }));
  const ref = useRef<HTMLElement>(null);
  const note = useRef<HTMLTextAreaElement>(null);
  // Players mount once the card comes near the screen, and play only while it is on it.
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "600px" });
    const b = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    a.observe(el);
    b.observe(el);
    return () => (a.disconnect(), b.disconnect());
  }, []);
  const toggle = (next: Status) => {
    const set = status === next ? "waiting" : next;
    void onSet({ status: set });
    if (set === "change") setTimeout(() => note.current?.focus(), 0);
  };
  const past = review?.history.filter((h) => h.comment).at(-1);
  return (
    <section ref={ref} id={card.id} className={`card lab-card ${status}`}>
      <div className="lab-head">
        <h2>{card.id}</h2>
        <span className="chip">{card.kind}</span>
        <span className="chip">{card.purpose}</span>
        {card.added && <span className="chip new">New</span>}
        <span className={`pill ${status}`}>{statusLabel[status]}</span>
      </div>
      <p className="lab-summary">
        <Accented text={card.summary} />
      </p>
      <div className="lab-players">
        {card.sample ? (
          labViews(card).map(({ size, tone }) => (
            <figure key={`${size}-${tone}`} className={size === "wide" ? "wide" : ""}>
              {near ? <LabPlayer card={card} size={size} tone={tone} playing={visible} /> : <div className="lab-placeholder" />}
              <figcaption>{viewLabel(size, tone)}</figcaption>
            </figure>
          ))
        ) : (
          <div className="lab-nosample">{card.noSample}</div>
        )}
      </div>
      <div className="lab-bottom">
        <table className="slots">
          <tbody>
            {card.slots.map((s) => (
              <tr key={s.name}>
                <td className="mono">{s.name}</td>
                <td className="muted">{s.type}</td>
                <td className="muted">{s.max ? `≤ ${s.max}` : s.count ? `${s.count[0]} to ${s.count[1]}` : ""}</td>
                <td className="muted">{[s.optional ? "optional" : "", s.note ?? ""].filter(Boolean).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <div className="actions">
            <button className={`btn approve ${status === "approved" ? "on" : ""}`} onClick={() => toggle("approved")}>
              ✓ Approve
            </button>
            <button className={`btn change ${status === "change" ? "on" : ""}`} onClick={() => toggle("change")}>
              Change
            </button>
          </div>
          <textarea ref={note} placeholder="What should change?" value={comment.value} onChange={(e) => comment.change(e.target.value)} onBlur={comment.blur} rows={2} />
          {past && (
            <div className="history">
              You asked before: <q>{past.comment}</q>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const LabPlayer: React.FC<{ card: Card; size: LabSize; tone: LabTone; playing: boolean }> = ({ card, size, tone, playing }) => {
  const r = useMemo(() => labResolved(card, size, tone)!, [card, size, tone]);
  const player = useRef<PlayerRef>(null);
  useEffect(() => (playing ? player.current?.play() : player.current?.pause()), [playing]);
  const wide = size === "wide";
  return (
    <Player
      ref={player}
      component={(wide ? Wide : Reel) as React.FC<typeof r>}
      inputProps={r}
      durationInFrames={frames(r)}
      compositionWidth={wide ? 1920 : 1080}
      compositionHeight={wide ? 1080 : 1920}
      fps={r.fps}
      loop
      initiallyMuted
      clickToPlay
      style={{ width: "100%", aspectRatio: wide ? "16 / 9" : "9 / 16" }}
    />
  );
};

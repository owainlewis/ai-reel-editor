import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { pal, SoftAccented } from "./soft";
import { style } from "./style";
import { clamp, ease } from "./theme";
import type { ResolvedShot, ResolvedVisual } from "./schema";

// Blueprint card kinds: agenda, before/after, KPI row, 2x2 matrix, timeline, layers, checklist,
// quote, logo wall, bento. Each is laid out by a pure geometry function (exported, and tested in
// tests/cards.test.ts): every card's height comes from the numbers that lay out its content, so the
// padding is even on every side, and every text is sized so its longest line fits its room.
// Sizes, colours and motion all come from the style's tokens.

type Props = { slug: string; shot: ResolvedShot; time: number; w: number; h: number };
type V<K extends ResolvedVisual["kind"]> = Extract<ResolvedVisual, { kind: K }> & { times?: number[] };
export type Box = { x: number; y: number; w: number; h: number };
// A text and the room it was sized for: `chars` at `size` must fit `room` px on `lines` lines.
export type Fit = { text: string; size: number; room: number; lines: number; font: "sans" | "mono" | "serif"; tracking: number };
// What a layout puts where. `cards` are padded surfaces: `content` is the height of what is stacked
// inside, which must leave at least `pad` above and below. `parts` are other placed elements.
export type Geom = { cards: { box: Box; pad: number; content: number }[]; parts: Box[]; texts: Fit[] };

const S = style.space;
const F = style.font;
const M = style.motion;

const src = (slug: string, p: string) => (/^(https?|data):/.test(p) ? p : staticFile(`${slug}/${p}`));
const prog = (time: number, at: number, dur: number = M.enter) => (isFinite(at) ? interpolate(time, [at, at + dur], [0, 1], { ...clamp, easing: ease }) : 0);
// Arrives out of a blur, rising a little.
const land = (p: number, dy = 24): React.CSSProperties => ({ opacity: p, filter: `blur(${(1 - p) * M.blur}px)`, translate: `0 ${(1 - p) * dy}px` });
// Each part's time: its spoken word, or a quick cascade from the shot's start.
const timesOf = (v: { times?: number[] }, n: number, start: number) => Array.from({ length: n }, (_, i) => v.times?.[i] ?? start + 0.3 + i * M.stagger * 3);
// The part that was named last (-1 before the first).
const current = (times: number[], time: number) => times.filter((x) => time >= x - 0.05).length - 1;

const glyph = (font: Fit["font"]) => (font === "mono" ? F.monoWidth : font === "serif" ? 0.5 : F.sansWidth);
const chars = (s: string) => s.replace(/\*/g, "").length;
const widthOf = (s: string, size: number, font: Fit["font"], tracking = 0) => chars(s) * (size * glyph(font) + tracking);
// Wrapping breaks at words, so text on more than one line gets 15% slack per line.
const usable = (room: number, lines: number) => (lines > 1 ? room * lines * 0.85 : room);
// The largest size up to `max` at which the longest of `texts` fits `room` on `lines` lines.
export const fit = (texts: string[], room: number, max: number, font: Fit["font"] = "sans", lines = 1, tracking = 0) => {
  const longest = Math.max(1, ...texts.map(chars));
  return Math.floor(Math.min(max, (usable(room, lines) / longest - tracking) / glyph(font)));
};
const fits = (texts: string[], size: number, room: number, font: Fit["font"] = "sans", lines = 1, tracking = 0): Fit[] =>
  texts.filter(Boolean).map((text) => ({ text, size, room, lines, font, tracking }));
// Lines a text wraps to at this size, by the same estimate.
const linesOf = (s: string, size: number, room: number, font: Fit["font"] = "sans") => Math.max(1, Math.ceil(widthOf(s, size, font) / (room * 0.85)));

// The small mono title over a card, as on charts and pipelines.
const TITLE = { size: 26, tracking: 5, h: 40, gap: 26 };
const titleH = (title?: string) => (title ? TITLE.h + TITLE.gap : 0);
const Title: React.FC<{ text: string; y: number; c: ReturnType<typeof pal>; p: number; center?: boolean }> = ({ text, y, c, p, center }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, height: TITLE.h, display: "flex", alignItems: "center", justifyContent: center ? "center" : "flex-start", fontFamily: F.mono, fontSize: TITLE.size, letterSpacing: TITLE.tracking, textTransform: "uppercase", color: c.muted, opacity: p, whiteSpace: "nowrap" }}>
    {text}
  </div>
);
const titleFit = (title: string | undefined, w: number) => (title ? fits([title], TITLE.size, w, "mono", 1, TITLE.tracking) : []);

const surface = (c: ReturnType<typeof pal>, b: Box, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: "absolute",
  left: b.x,
  top: b.y,
  width: b.w,
  height: b.h,
  borderRadius: S.radius,
  background: c.card,
  border: `1.5px solid ${c.line}`,
  boxShadow: c.shadow,
  boxSizing: "border-box",
  ...extra,
});

// ---------- Rows in one card: agenda and checklist ----------

const rowsGeom = (n: number, title: string | undefined, w: number, h: number, maxRow: number) => {
  const head = titleH(title);
  const pad = S.cardPad;
  const rowH = Math.min(maxRow, (h - head - pad * 2) / n);
  const cardH = pad * 2 + rowH * n;
  const top = head + Math.max(0, (h - head - cardH) / 2);
  return { head, pad, rowH, card: { x: 0, y: top, w, h: cardH } as Box };
};

export const agendaGeom = (v: V<"agenda">, w: number, h: number) => {
  const g = rowsGeom(v.items.length, v.title, w, h, 150);
  const num = Math.round(Math.min(40, g.rowH * 0.3));
  const numW = num * F.monoWidth * 2 + 40;
  const notes = v.items.map((it) => it.note ?? "");
  const noteSize = 26;
  const noteW = notes.some(Boolean) ? Math.max(...notes.map((s) => widthOf(s, noteSize, "mono"))) + 28 : 0;
  const room = w - g.pad * 2 - numW - noteW;
  const size = fit(v.items.map((it) => it.text), room, Math.min(56, g.rowH * 0.42));
  const geom: Geom = {
    cards: [{ box: g.card, pad: g.pad, content: g.rowH * v.items.length }],
    parts: v.title ? [{ x: 0, y: g.card.y - g.head, w, h: TITLE.h }] : [],
    texts: [...titleFit(v.title, w), ...fits(v.items.map((it) => it.text), size, room), ...fits(notes, noteSize, noteW, "mono"), ...fits(["05"], num, numW - 40, "mono")],
  };
  return { ...g, num, numW, noteSize, noteW, size, geom };
};

export const AgendaCard: React.FC<Props & { v: V<"agenda"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = agendaGeom(v, w, h);
  const times = timesOf(v, v.items.length, shot.start);
  const now = v.active ?? current(times, time);
  const enter = prog(time, shot.start);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.title && <Title text={v.title} y={g.card.y - g.head} c={c} p={enter} />}
      <div style={{ ...surface(c, g.card), padding: `${g.pad}px ${g.pad}px`, ...land(enter, 30) }}>
        {v.items.map((it, i) => {
          const on = i === now;
          // Every part shows from the start, dim and soft, and sharpens when it is named.
          const said = v.active !== undefined ? 1 : prog(time, times[i], 0.4);
          return (
            <div key={i} style={{ height: g.rowH, display: "flex", alignItems: "center", borderTop: i ? `1px solid ${c.line}` : "none" }}>
              <div style={{ width: g.numW, flex: "none", fontFamily: F.mono, fontWeight: 600, fontSize: g.num, color: on ? c.accentText : c.faint }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ flex: 1, minWidth: 0, fontFamily: F.sans, fontWeight: 700, fontSize: g.size, letterSpacing: -g.size * 0.02, whiteSpace: "nowrap", color: on ? c.ink : c.muted, opacity: 0.4 + 0.6 * said, filter: `blur(${(1 - said) * 2.5}px)` }}>
                <SoftAccented text={it.text} c={c} />
              </div>
              {g.noteW > 0 && <div style={{ width: g.noteW, flex: "none", textAlign: "right", fontFamily: F.mono, fontSize: g.noteSize, color: c.muted, opacity: 0.4 + 0.6 * said }}>{it.note}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const checklistGeom = (v: V<"checklist">, w: number, h: number) => {
  const g = rowsGeom(v.items.length, v.title, w, h, 140);
  const box = Math.round(Math.min(52, g.rowH * 0.42));
  const boxW = box + 34;
  const room = w - g.pad * 2 - boxW;
  const size = fit(v.items.map((it) => it.text), room, Math.min(54, g.rowH * 0.42));
  const geom: Geom = {
    cards: [{ box: g.card, pad: g.pad, content: g.rowH * v.items.length }],
    parts: v.title ? [{ x: 0, y: g.card.y - g.head, w, h: TITLE.h }] : [],
    texts: [...titleFit(v.title, w), ...fits(v.items.map((it) => it.text), size, room)],
  };
  return { ...g, box, boxW, size, geom };
};

export const ChecklistCard: React.FC<Props & { v: V<"checklist"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = checklistGeom(v, w, h);
  const times = timesOf(v, v.items.length, shot.start);
  const enter = prog(time, shot.start);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.title && <Title text={v.title} y={g.card.y - g.head} c={c} p={enter} />}
      <div style={{ ...surface(c, g.card), padding: g.pad, ...land(enter, 30) }}>
        {v.items.map((it, i) => {
          const tick = prog(time, times[i], 0.35);
          const draw = prog(time, times[i] + 0.08, 0.35);
          return (
            <div key={i} style={{ height: g.rowH, display: "flex", alignItems: "center", borderTop: i ? `1px solid ${c.line}` : "none" }}>
              <div style={{ width: g.boxW, flex: "none" }}>
                <div style={{ width: g.box, height: g.box, borderRadius: g.box * 0.26, boxSizing: "border-box", border: `3px solid ${tick > 0.5 ? c.accent : c.faint}`, background: tick > 0.5 ? c.accent : "transparent", scale: String(1 + 0.12 * Math.sin(tick * Math.PI)), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width={g.box * 0.62} height={g.box * 0.62} viewBox="0 0 24 24">
                    <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={style.color.onAccent} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
                  </svg>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, fontFamily: F.sans, fontWeight: 700, fontSize: g.size, letterSpacing: -g.size * 0.02, whiteSpace: "nowrap", color: tick > 0.5 ? c.ink : c.muted, opacity: 0.45 + 0.55 * tick }}>
                <SoftAccented text={it.text} c={c} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- Before / after ----------

export const beforeAfterGeom = (v: V<"beforeafter">, w: number, h: number) => {
  const side = w / h >= 1.15;
  const arrow = 88;
  const pad = S.cardPad;
  const cw = side ? (w - arrow) / 2 : w;
  const room = cw - pad * 2;
  const label = { size: 24, tracking: 4, h: 32, gap: 18 };
  const texts = [v.before.text ?? "", v.after.text ?? ""];
  const textSize = fit(texts.filter(Boolean), room, 36, "sans", 2);
  const textLines = Math.max(0, ...texts.filter(Boolean).map((s) => linesOf(s, textSize, room)));
  const textH = textLines ? 16 + textLines * textSize * 1.25 : 0;
  const maxH = side ? h : (h - arrow) / 2;
  let value = fit([v.before.value, v.after.value], room, side ? 104 : 128);
  value = Math.floor(Math.min(value, maxH - pad * 2 - label.h - label.gap - textH));
  const content = label.h + label.gap + value * 1.05 + textH;
  const ch = content + pad * 2;
  const boxes: Box[] = side
    ? [{ x: 0, y: (h - ch) / 2, w: cw, h: ch }, { x: cw + arrow, y: (h - ch) / 2, w: cw, h: ch }]
    : [{ x: 0, y: (h - ch * 2 - arrow) / 2, w, h: ch }, { x: 0, y: (h - ch * 2 - arrow) / 2 + ch + arrow, w, h: ch }];
  const geom: Geom = {
    cards: boxes.map((box) => ({ box, pad, content })),
    parts: [],
    texts: [...fits([v.before.label, v.after.label], label.size, room, "mono", 1, label.tracking), ...fits([v.before.value, v.after.value], value, room), ...fits(texts, textSize, room, "sans", 2)],
  };
  return { side, arrow, pad, label, value, textSize, boxes, geom };
};

export const BeforeAfterCard: React.FC<Props & { v: V<"beforeafter"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = beforeAfterGeom(v, w, h);
  const at = v.times?.[0] ?? shot.start + 0.8;
  const a = prog(time, shot.start);
  const b = prog(time, at, 0.5);
  const [l, r] = g.boxes;
  const arrowAt = g.side ? { x: l.w + g.arrow / 2, y: l.y + l.h / 2 } : { x: w / 2, y: l.y + l.h + g.arrow / 2 };
  const panel = (box: Box, s: { label: string; value: string; text?: string }, after: boolean, p: number) => (
    <div style={{ ...surface(c, box, { border: `${after ? 3 : 1.5}px solid ${after && p > 0.5 ? c.accent : c.line}`, padding: g.pad }), ...land(p, 36), opacity: after ? p : p * (1 - 0.45 * b) }}>
      <div style={{ height: g.label.h, display: "flex", alignItems: "center", fontFamily: F.mono, fontSize: g.label.size, letterSpacing: g.label.tracking, textTransform: "uppercase", color: after ? c.accentText : c.muted }}>{s.label}</div>
      <div style={{ marginTop: g.label.gap, fontFamily: F.sans, fontWeight: 700, fontSize: g.value, lineHeight: 1.05, letterSpacing: -g.value * 0.035, whiteSpace: "nowrap", color: after ? c.ink : b > 0.5 ? c.muted : c.ink }}>
        <SoftAccented text={s.value} c={c} />
      </div>
      {s.text && <div style={{ marginTop: 16, fontFamily: F.sans, fontWeight: 500, fontSize: g.textSize, lineHeight: 1.25, color: c.muted }}>{s.text}</div>}
    </div>
  );
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {panel(l, v.before, false, a)}
      {panel(r, v.after, true, b)}
      <div style={{ position: "absolute", left: arrowAt.x - 30, top: arrowAt.y - 30, width: 60, height: 60, borderRadius: 30, background: b > 0.3 ? c.accent : c.chip, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.max(a * 0.6, b), rotate: g.side ? "0deg" : "90deg" }}>
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={b > 0.3 ? style.color.onAccent : c.muted} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  );
};

// ---------- KPI row ----------

export const kpiGeom = (v: V<"kpi">, w: number, h: number) => {
  const n = v.items.length;
  const wide = w / h >= 1.5;
  // Across on 16:9, a 2x2 for four in a tall panel, otherwise one tile per row, value beside label.
  const mode: "stacked" | "rows" = wide || n === 4 ? "stacked" : "rows";
  const cols = wide ? n : n === 4 ? 2 : 1;
  const rows = Math.ceil(n / cols);
  const head = titleH(v.title);
  const foot = 24 * 1.4 + 22;
  const gap = mode === "rows" ? 22 : S.gap;
  const availH = h - head - foot;
  const tw = (w - gap * (cols - 1)) / cols;
  const th = Math.min(mode === "rows" ? 200 : 340, (availH - gap * (rows - 1)) / rows);
  const top = head + (availH - (rows * th + (rows - 1) * gap)) / 2;
  const pad = S.cardPadSmall;
  const padX = S.cardPad;
  const room = tw - padX * 2;
  const values = v.items.map((it) => it.value);
  const labels = v.items.map((it) => it.label);
  let value: number, label: number, labelRoom: number, content: number;
  if (mode === "rows") {
    const valueRoom = room * 0.44;
    labelRoom = room - valueRoom - S.gap;
    label = fit(labels, labelRoom, 36, "sans", 2);
    value = Math.floor(Math.min(fit(values, valueRoom, 110, "mono"), th - pad * 2));
    const lines = Math.max(...labels.map((s) => linesOf(s, label, labelRoom)));
    content = Math.max(value, lines * label * 1.2);
  } else {
    labelRoom = room;
    label = fit(labels, room, 34, "sans", 2);
    const lines = Math.max(...labels.map((s) => linesOf(s, label, room)));
    const labelH = lines * label * 1.2;
    value = Math.floor(Math.min(fit(values, room, 120, "mono"), th - pad * 2 - 14 - labelH));
    content = value + 14 + labelH;
  }
  const boxes: Box[] = v.items.map((_, i) => ({ x: (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th }));
  const geom: Geom = {
    cards: boxes.map((box) => ({ box, pad, content })),
    parts: [{ x: 0, y: h - 24 * 1.4, w, h: 24 * 1.4 }, ...(v.title ? [{ x: 0, y: top - head, w, h: TITLE.h }] : [])],
    texts: [...titleFit(v.title, w), ...fits(values, value, mode === "rows" ? room * 0.44 : room, "mono"), ...fits(labels, label, labelRoom, "sans", 2), ...fits([v.source], 24, w, "mono")],
  };
  return { mode, boxes, top, head, padX, value, label, geom };
};

// "2,500" counts up in whole steps; "4.2x" keeps its decimals; anything else just lands.
const counted = (value: string, p: number) => {
  const m = value.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
  if (!m) return value;
  const target = parseFloat(m[2].replace(/,/g, ""));
  const decimals = (m[2].split(".")[1] || "").length;
  const now = target * p;
  return m[1] + (decimals ? now.toFixed(decimals) : Math.round(now).toLocaleString("en-US")) + m[3];
};

export const KpiCard: React.FC<Props & { v: V<"kpi"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = kpiGeom(v, w, h);
  const times = timesOf(v, v.items.length, shot.start);
  const hi = v.highlight ?? v.items.length - 1;
  const enter = prog(time, shot.start);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.title && <Title text={v.title} y={g.top - g.head} c={c} p={enter} />}
      {v.items.map((it, i) => {
        const b = g.boxes[i];
        const p = prog(time, times[i]);
        const roll = interpolate(time, [times[i], times[i] + 0.9], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
        const on = i === hi;
        const valueEl = (
          <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: g.value, lineHeight: 1, letterSpacing: -g.value * 0.03, color: on ? c.accentText : c.ink, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{counted(it.value, roll)}</div>
        );
        const labelEl = <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: g.label, lineHeight: 1.2, letterSpacing: -0.4, color: c.muted }}>{it.label}</div>;
        return (
          <div key={i} style={{ ...surface(c, b, { border: `${on ? 3 : 1.5}px solid ${on && p > 0.5 ? c.accent : c.line}`, padding: `0 ${g.padX}px` }), ...land(p, 30), display: "flex", flexDirection: g.mode === "rows" ? "row" : "column", alignItems: g.mode === "rows" ? "center" : "flex-start", justifyContent: g.mode === "rows" ? "space-between" : "center", gap: g.mode === "rows" ? S.gap : 14 }}>
            {valueEl}
            <div style={g.mode === "rows" ? { flex: 1, textAlign: "right" } : undefined}>{labelEl}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, bottom: 0, fontFamily: F.mono, fontSize: 24, letterSpacing: 0.5, color: c.muted, opacity: enter }}>{v.source}</div>
    </div>
  );
};

// ---------- 2x2 matrix ----------

export const matrixGeom = (v: V<"matrix">, w: number, h: number) => {
  const head = titleH(v.title);
  const chipH = 46;
  const labelH = chipH + 18;
  const plot: Box = { x: 0, y: head + labelH, w, h: h - head - labelH * 2 };
  const gutter = 30;
  const qw = w / 2 - gutter * 1.5;
  const qh = plot.h / 2 - gutter * 1.5;
  const quad = (q: string): Box => ({ x: q.endsWith("l") ? gutter : w / 2 + gutter / 2, y: plot.y + (q.startsWith("t") ? gutter : plot.h / 2 + gutter / 2), w: qw, h: qh });
  const pad = 26;
  const dot = 14;
  const room = qw - pad * 2 - dot - 16;
  const size = fit(v.items.map((it) => it.text), room, Math.min(54, qh * 0.16), "sans", 2);
  const axis = { size: 24, tracking: 3 };
  const chips = v.items.map((it) => {
    const q = quad(it.quad);
    const lines = linesOf(it.text, size, room);
    const ch = lines * size * 1.15 + pad * 2;
    // One line: the chip hugs its text. Wrapped: it takes the quadrant's width.
    const cw = lines > 1 ? qw : Math.min(qw, widthOf(it.text, size, "sans") + pad * 2 + dot + 16 + 12);
    return { box: { x: q.x + (q.w - cw) / 2, y: q.y + (q.h - ch) / 2, w: cw, h: ch } as Box, content: lines * size * 1.15 };
  });
  const axisRoom = w / 2 - 40;
  const geom: Geom = {
    cards: chips.map((ch) => ({ box: ch.box, pad, content: ch.content })),
    parts: [plot, { x: 0, y: head, w, h: chipH }, { x: 0, y: h - chipH, w, h: chipH }],
    texts: [...titleFit(v.title, w), ...fits(v.items.map((it) => it.text), size, room, "sans", 2), ...fits([...v.x, ...v.y], axis.size, axisRoom - 40, "mono", 1, axis.tracking)],
  };
  return { head, chipH, plot, chips, pad, dot, size, axis, geom };
};

export const MatrixCard: React.FC<Props & { v: V<"matrix"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = matrixGeom(v, w, h);
  const times = timesOf(v, v.items.length, shot.start + 0.4);
  const now = current(times, time);
  const draw = prog(time, shot.start, M.settle);
  const lab = prog(time, shot.start + 0.2);
  const cx = w / 2;
  const cy = g.plot.y + g.plot.h / 2;
  const chip = (text: string, style_: React.CSSProperties) => (
    <div style={{ position: "absolute", height: g.chipH, padding: "0 20px", borderRadius: g.chipH / 2, background: c.bg, border: `1px solid ${c.line}`, display: "flex", alignItems: "center", fontFamily: F.mono, fontSize: g.axis.size, letterSpacing: g.axis.tracking, textTransform: "uppercase", color: c.muted, whiteSpace: "nowrap", opacity: lab, ...style_ }}>
      {text}
    </div>
  );
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.title && <Title text={v.title} y={0} c={c} p={lab} center />}
      <div style={{ position: "absolute", left: cx - 1, top: g.plot.y, width: 2, height: g.plot.h, background: c.ink, opacity: 0.8, scale: `1 ${draw}` }} />
      <div style={{ position: "absolute", left: 0, top: cy - 1, width: w, height: 2, background: c.ink, opacity: 0.8, scale: `${draw} 1` }} />
      {chip(v.y[1], { left: cx, top: g.head, translate: "-50% 0" })}
      {chip(v.y[0], { left: cx, top: h - g.chipH, translate: "-50% 0" })}
      {chip(v.x[0], { left: 0, top: cy - g.chipH / 2 })}
      {chip(v.x[1], { right: 0, top: cy - g.chipH / 2 })}
      {v.items.map((it, i) => {
        const b = g.chips[i].box;
        const p = prog(time, times[i]);
        const on = i === now;
        return (
          <div key={i} style={{ ...surface(c, b, { borderRadius: S.radiusSmall, border: `${on ? 3 : 1.5}px solid ${on && p > 0.5 ? c.accent : c.line}`, padding: `0 ${g.pad}px` }), ...land(p, 20), display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: "none", width: g.dot, height: g.dot, borderRadius: g.dot, background: on ? c.accent : c.faint }} />
            <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: g.size, lineHeight: 1.15, letterSpacing: -g.size * 0.02, color: c.ink }}>
              <SoftAccented text={it.text} c={c} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Timeline ----------

export const timelineGeom = (v: V<"timeline">, w: number, h: number) => {
  const n = v.items.length;
  // Across on a wide panel (the split, 16:9); down the frame on a tall scene, or past four.
  const across = n <= 4 && w >= 800 && w / h >= 1.1;
  const head = titleH(v.title);
  const dates = v.items.map((it) => it.date);
  const labels = v.items.map((it) => it.text);
  const dot = 30;
  if (across) {
    const slot = w / n;
    const room = slot - 28;
    const date = fit(dates, room, 32, "mono");
    const label = fit(labels, room, 46, "sans", 2);
    const lines = Math.max(...labels.map((s) => linesOf(s, label, room)));
    const block = date * 1.2 + 24 + dot + 28 + lines * label * 1.15;
    const top = head + (h - head - block) / 2;
    const track = top + date * 1.2 + 24 + dot / 2;
    const xs = v.items.map((_, i) => slot * (i + 0.5));
    const geom: Geom = {
      cards: [],
      parts: [{ x: 0, y: top, w, h: block }, ...(v.title ? [{ x: 0, y: top - head, w, h: TITLE.h }] : [])],
      texts: [...titleFit(v.title, w), ...fits(dates, date, room, "mono"), ...fits(labels, label, room, "sans", 2)],
    };
    return { across, head, dot, date, label, top, track, xs, ys: [] as number[], rowH: 0, x: 0, geom };
  }
  const rowH = Math.min(200, (h - head) / n);
  const top = head + (h - head - rowH * n) / 2;
  const x = dot / 2 + 4;
  const room = w - x - dot / 2 - 40;
  const date = Math.round(Math.min(32, Math.max(F.labelMin, rowH * 0.2)));
  const label = fit(labels, room, Math.min(68, rowH * 0.36));
  const ys = v.items.map((_, i) => top + rowH * (i + 0.5));
  const geom: Geom = {
    cards: [],
    parts: [{ x: 0, y: top, w, h: rowH * n }, ...(v.title ? [{ x: 0, y: top - head, w, h: TITLE.h }] : [])],
    texts: [...titleFit(v.title, w), ...fits(dates, date, room, "mono"), ...fits(labels, label, room)],
  };
  return { across, head, dot, date, label, top, track: 0, xs: [] as number[], ys, rowH, x, geom };
};

export const TimelineCard: React.FC<Props & { v: V<"timeline"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = timelineGeom(v, w, h);
  const n = v.items.length;
  const times = timesOf(v, n, shot.start);
  const now = current(times, time);
  const enter = prog(time, shot.start);
  // The track fills smoothly from milestone to milestone.
  const fill = times.reduce((acc, at, i) => (i === 0 ? acc : acc + prog(time, at, M.settle)), 0) / Math.max(1, n - 1);
  const dotEl = (i: number) => {
    const reached = i <= now;
    const on = i === now;
    return <div style={{ width: g.dot, height: g.dot, borderRadius: g.dot, boxSizing: "border-box", background: on ? c.accent : reached ? c.ink : c.bg, border: `3px solid ${on ? c.accent : reached ? c.ink : c.faint}`, scale: String(on ? 1.15 : 1) }} />;
  };
  if (g.across) {
    const x0 = g.xs[0];
    const x1 = g.xs[n - 1];
    return (
      <div style={{ position: "relative", width: w, height: h, opacity: enter }}>
        {v.title && <Title text={v.title} y={g.top - g.head} c={c} p={enter} center />}
        <div style={{ position: "absolute", left: x0, width: x1 - x0, top: g.track - 1.5, height: 3, background: c.line }} />
        <div style={{ position: "absolute", left: x0, width: (x1 - x0) * fill, top: g.track - 1.5, height: 3, background: c.ink }} />
        {v.items.map((it, i) => {
          const p = prog(time, times[i]);
          const slot = w / n;
          return (
            <React.Fragment key={i}>
              <div style={{ position: "absolute", left: g.xs[i] - g.dot / 2, top: g.track - g.dot / 2 }}>{dotEl(i)}</div>
              <div style={{ position: "absolute", left: g.xs[i] - slot / 2 + 14, width: slot - 28, top: g.top, textAlign: "center", fontFamily: F.mono, fontSize: g.date, lineHeight: 1.2, color: i === now ? c.accentText : c.muted, opacity: 0.35 + 0.65 * p }}>{it.date}</div>
              <div style={{ position: "absolute", left: g.xs[i] - slot / 2 + 14, width: slot - 28, top: g.track + g.dot / 2 + 28, textAlign: "center", fontFamily: F.sans, fontWeight: 700, fontSize: g.label, lineHeight: 1.15, letterSpacing: -g.label * 0.02, color: i === now ? c.ink : c.muted, ...land(p, 14), opacity: 0.25 + 0.75 * p }}>
                <SoftAccented text={it.text} c={c} />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  }
  const y0 = g.ys[0];
  const y1 = g.ys[n - 1];
  return (
    <div style={{ position: "relative", width: w, height: h, opacity: enter }}>
      {v.title && <Title text={v.title} y={g.top - g.head} c={c} p={enter} />}
      <div style={{ position: "absolute", left: g.x - 1.5, top: y0, width: 3, height: y1 - y0, background: c.line }} />
      <div style={{ position: "absolute", left: g.x - 1.5, top: y0, width: 3, height: (y1 - y0) * fill, background: c.ink }} />
      {v.items.map((it, i) => {
        const p = prog(time, times[i]);
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: g.x - g.dot / 2, top: g.ys[i] - g.dot / 2 }}>{dotEl(i)}</div>
            <div style={{ position: "absolute", left: g.x + g.dot / 2 + 36, right: 0, top: g.ys[i], translate: `${(1 - p) * 24}px -50%`, opacity: 0.25 + 0.75 * p }}>
              <div style={{ fontFamily: F.mono, fontSize: g.date, color: i === now ? c.accentText : c.muted, marginBottom: 6 }}>{it.date}</div>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: g.label, lineHeight: 1.1, letterSpacing: -g.label * 0.02, color: i === now ? c.ink : c.muted, whiteSpace: "nowrap" }}>
                <SoftAccented text={it.text} c={c} />
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ---------- Layers ----------

export const levelsGeom = (v: V<"levels">, w: number, h: number) => {
  const n = v.items.length;
  const head = titleH(v.title);
  const gap = 14;
  const slabH = Math.min(170, (h - head - gap * (n - 1)) / n);
  const step = Math.min(30, w * 0.03);
  const total = slabH * n + gap * (n - 1);
  const top = head + (h - head - total) / 2;
  const pad = S.cardPadSmall;
  const tag = 24;
  const tagW = tag * F.monoWidth * 2 + 30;
  const notes = v.items.map((it) => it.note ?? "");
  const noteW = notes.some(Boolean) ? Math.max(...notes.map((s) => widthOf(s, tag, "mono"))) + 24 : 0;
  // The narrowest slab (the top one) sets the room every label must fit.
  const room = w - 2 * step * (n - 1) - pad * 2 - tagW - noteW;
  const size = fit(v.items.map((it) => it.text), room, Math.min(62, slabH * 0.4));
  // Item 0 is the foundation, at the bottom; each layer above is a little narrower.
  const boxes: Box[] = v.items.map((_, i) => ({ x: step * i, y: top + (n - 1 - i) * (slabH + gap), w: w - 2 * step * i, h: slabH }));
  const padY = (slabH - size * 1.2) / 2;
  const geom: Geom = {
    cards: boxes.map((box) => ({ box, pad: Math.min(pad, padY), content: size * 1.2 })),
    parts: v.title ? [{ x: 0, y: top - head, w, h: TITLE.h }] : [],
    texts: [...titleFit(v.title, w), ...fits(v.items.map((it) => it.text), size, room), ...fits(notes, tag, noteW, "mono")],
  };
  return { head, top, pad, tag, tagW, noteW, size, boxes, geom };
};

export const LevelsCard: React.FC<Props & { v: V<"levels"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = levelsGeom(v, w, h);
  const times = timesOf(v, v.items.length, shot.start);
  const now = current(times, time);
  const enter = prog(time, shot.start);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.title && <Title text={v.title} y={g.top - g.head} c={c} p={enter} />}
      {v.items.map((it, i) => {
        const b = g.boxes[i];
        // Each layer drops onto the stack on its word.
        const p = prog(time, times[i], 0.5);
        const on = i === now;
        return (
          <div key={i} style={{ ...surface(c, b, { borderRadius: S.radiusSmall, border: `${on ? 3 : 1.5}px solid ${on && p > 0.5 ? c.accent : c.line}`, padding: `0 ${g.pad}px` }), opacity: p, filter: `blur(${(1 - p) * M.blur}px)`, translate: `0 ${(1 - p) * -50}px`, display: "flex", alignItems: "center" }}>
            <div style={{ width: g.tagW, flex: "none", fontFamily: F.mono, fontWeight: 600, fontSize: g.tag, color: on ? c.accentText : c.faint }}>L{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0, fontFamily: F.sans, fontWeight: 700, fontSize: g.size, letterSpacing: -g.size * 0.02, whiteSpace: "nowrap", color: on ? c.ink : c.muted }}>
              <SoftAccented text={it.text} c={c} />
            </div>
            {g.noteW > 0 && <div style={{ width: g.noteW, flex: "none", textAlign: "right", fontFamily: F.mono, fontSize: g.tag, color: c.muted }}>{it.note}</div>}
          </div>
        );
      })}
    </div>
  );
};

// ---------- Quote ----------

export const quoteGeom = (v: V<"quote">, w: number, h: number) => {
  const mark = 120;
  const source = { size: 30, h: 30 * 1.3, gap: 34 };
  const areaH = h - mark - source.h - source.gap;
  let size = w / h < 1 ? 104 : 88;
  while (size > 40 && Math.ceil(widthOf(v.text, size, "serif") / w) * size * 1.18 > areaH) size -= 2;
  const lines = Math.ceil(widthOf(v.text, size, "serif") / w);
  const block = mark + lines * size * 1.18 + source.gap + source.h;
  const top = (h - block) / 2;
  const geom: Geom = {
    cards: [],
    parts: [{ x: 0, y: top, w, h: block }],
    texts: [...fits([v.text], size, w, "serif", lines), ...fits([`— ${v.source}`], source.size, w)],
  };
  return { mark, source, size, lines, top, geom };
};

export const QuoteCard: React.FC<Props & { v: V<"quote"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = quoteGeom(v, w, h);
  const at = v.times?.[0] ?? shot.start + 0.15;
  const words = v.text.split(/\s+/);
  // Words resolve in reading order over about a second, so the quote reads as it is spoken.
  const per = Math.min(0.06, 1.1 / words.length);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <div style={{ position: "absolute", left: 0, top: g.top, width: w }}>
        <div style={{ height: g.mark, fontFamily: F.serif, fontSize: 200, lineHeight: 1, color: c.accentText, opacity: prog(time, shot.start), translate: "-6px 0" }}>“</div>
        <div style={{ fontFamily: F.serif, fontWeight: 400, fontSize: g.size, lineHeight: 1.18, letterSpacing: -g.size * 0.015, color: c.ink }}>
          {words.map((wd, i) => {
            const p = prog(time, at + i * per, 0.4);
            return (
              <React.Fragment key={i}>
                {i > 0 && " "}
                <span style={{ opacity: 0.18 + 0.82 * p, filter: `blur(${(1 - p) * 4}px)` }}>{wd}</span>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ marginTop: g.source.gap, fontFamily: F.sans, fontWeight: 500, fontSize: g.source.size, lineHeight: 1.3, color: c.muted, opacity: prog(time, at + words.length * per) }}>— {v.source}</div>
      </div>
    </div>
  );
};

// ---------- Logo wall ----------

export const logowallGeom = (v: V<"logowall">, w: number, h: number) => {
  const n = v.items.length;
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const cap = v.caption ? 44 * 1.2 + 36 : 0;
  const gap = 24;
  const tile = Math.floor(Math.min(240, (w - gap * (cols - 1)) / cols, (h - cap - gap * (rows - 1)) / rows));
  const gw = cols * tile + (cols - 1) * gap;
  const gh = rows * tile + (rows - 1) * gap;
  const top = (h - gh - cap) / 2;
  const left = (w - gw) / 2;
  const boxes: Box[] = v.items.map((_, i) => {
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, n - r * cols);
    const off = ((cols - inRow) * (tile + gap)) / 2;
    return { x: left + off + (i % cols) * (tile + gap), y: top + r * (tile + gap), w: tile, h: tile };
  });
  const capSize = v.caption ? fit([v.caption], w, 44, "serif") : 0;
  const geom: Geom = {
    cards: boxes.map((box) => ({ box, pad: tile * 0.21, content: tile * 0.58 })),
    parts: v.caption ? [{ x: 0, y: top + gh + 36, w, h: 44 * 1.2 }] : [],
    texts: v.caption ? fits([v.caption], capSize, w, "serif") : [],
  };
  return { cols, tile, boxes, top, gh, capSize, geom };
};

export const LogowallCard: React.FC<Props & { v: V<"logowall"> }> = ({ slug, shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = logowallGeom(v, w, h);
  const at = v.times?.[0] ?? shot.start;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.items.map((it, i) => {
        const b = g.boxes[i];
        const p = prog(time, at + (Math.floor(i / g.cols) + (i % g.cols)) * 0.07, 0.5);
        // Logos always sit on white tiles, in either tone, so they read as their makers drew them.
        return (
          <div key={i} style={{ ...surface(c, b, { background: style.color.light.card, borderRadius: b.w * 0.2 }), ...land(p, 30), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Img src={src(slug, it.src)} style={{ width: b.w * 0.58, height: b.w * 0.58, objectFit: "contain" }} />
          </div>
        );
      })}
      {v.caption && (
        <div style={{ position: "absolute", left: 0, right: 0, top: g.top + g.gh + 36, textAlign: "center", fontFamily: F.serif, fontStyle: "italic", fontSize: g.capSize, lineHeight: 1.2, color: c.muted, opacity: prog(time, at + 0.4) }}>{v.caption}</div>
      )}
    </div>
  );
};

// ---------- Bento ----------

export const bentoGeom = (v: V<"bento">, w: number, h: number) => {
  const n = v.cells.length;
  const gap = 20;
  // One wide cell on top, the rest two to a row.
  const rows: number[][] = [[0]];
  for (let i = 1; i < n; i += 2) rows.push(i + 1 < n ? [i, i + 1] : [i]);
  const shares = rows.map((_, r) => (r === 0 ? 1.5 : 1));
  const unit = (h - gap * (rows.length - 1)) / shares.reduce((a, b) => a + b, 0);
  const boxes: Box[] = [];
  let y = 0;
  rows.forEach((row, r) => {
    const rh = unit * shares[r];
    const cw = (w - gap * (row.length - 1)) / row.length;
    row.forEach((i, k) => (boxes[i] = { x: k * (cw + gap), y, w: cw, h: rh }));
    y += rh + gap;
  });
  const cells = v.cells.map((cell, i) => {
    const b = boxes[i];
    const big = i === 0;
    const pad = big ? S.cardPad : S.cardPadSmall;
    const room = b.w - pad * 2;
    const fitted = { title: fit([cell.title], room, big ? 76 : 54, "sans", 2), text: cell.text ? fit([cell.text], room, big ? 38 : 32, "sans", 3) : 0, value: cell.value ? fit([cell.value], room, big ? 96 : 72, "mono") : 0 };
    // The cell's type scales down together until it fits inside the padding, never under the floor.
    const at = (k: number) => ({
      title: Math.max(F.minSize, Math.floor(fitted.title * k)),
      text: fitted.text ? Math.max(F.minSize, Math.floor(fitted.text * k)) : 0,
      value: fitted.value ? Math.max(F.labelMin, Math.floor(fitted.value * k)) : 0,
    });
    const heightOf = (z: ReturnType<typeof at>) =>
      (z.value ? z.value + 14 : 0) + linesOf(cell.title, z.title, room) * z.title * 1.12 + (cell.text ? 12 + linesOf(cell.text, z.text, room) * z.text * 1.25 : 0);
    let k = 1;
    while (k > 0.3 && heightOf(at(k)) > b.h - pad * 2) k -= 0.02;
    const { title, text, value } = at(k);
    const height = () => heightOf({ title, text, value });
    return { pad, room, title, text, value, content: height(), heightOf };
  });
  // The small cells share one size (the smallest), so a cell alone in its row does not outrank the rest.
  const small = cells.slice(1);
  if (small.length) {
    const title = Math.min(...small.map((m) => m.title));
    const text = Math.min(...small.map((m) => m.text || Infinity));
    for (const m of small) {
      m.title = title;
      m.text = m.text ? text : 0;
      m.content = m.heightOf({ title: m.title, text: m.text, value: m.value });
    }
  }
  const geom: Geom = {
    cards: boxes.map((box, i) => ({ box, pad: cells[i].pad, content: cells[i].content })),
    parts: [],
    texts: v.cells.flatMap((cell, i) => [
      ...fits([cell.title], cells[i].title, cells[i].room, "sans", 2),
      ...(cell.text ? fits([cell.text], cells[i].text, cells[i].room, "sans", 3) : []),
      ...(cell.value ? fits([cell.value], cells[i].value, cells[i].room, "mono") : []),
    ]),
  };
  return { boxes, cells, geom };
};

export const BentoCard: React.FC<Props & { v: V<"bento"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = bentoGeom(v, w, h);
  const times = timesOf(v, v.cells.length, shot.start);
  const now = current(times, time);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.cells.map((cell, i) => {
        const b = g.boxes[i];
        const m = g.cells[i];
        const p = prog(time, times[i]);
        const on = i === now;
        return (
          <div key={i} style={{ ...surface(c, b, { border: `${on ? 3 : 1.5}px solid ${on && p > 0.5 ? c.accent : c.line}`, padding: m.pad }), ...land(p, 30), display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {cell.value && <div style={{ fontFamily: F.mono, fontWeight: 600, fontSize: m.value, lineHeight: 1, letterSpacing: -m.value * 0.03, color: i === 0 ? c.accentText : c.ink, marginBottom: 14, whiteSpace: "nowrap" }}>{cell.value}</div>}
            <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: m.title, lineHeight: 1.12, letterSpacing: -m.title * 0.025, color: c.ink }}>
              <SoftAccented text={cell.title} c={c} />
            </div>
            {cell.text && <div style={{ marginTop: 12, fontFamily: F.sans, fontWeight: 500, fontSize: m.text, lineHeight: 1.25, color: c.muted }}>{cell.text}</div>}
          </div>
        );
      })}
    </div>
  );
};

// The layout of any Blueprint card kind, for tests and the style lab.
export const cardGeom = (v: ResolvedVisual, w: number, h: number): Geom | undefined => {
  switch (v.kind) {
    case "agenda": return agendaGeom(v, w, h).geom;
    case "checklist": return checklistGeom(v, w, h).geom;
    case "beforeafter": return beforeAfterGeom(v, w, h).geom;
    case "kpi": return kpiGeom(v, w, h).geom;
    case "matrix": return matrixGeom(v, w, h).geom;
    case "timeline": return timelineGeom(v, w, h).geom;
    case "levels": return levelsGeom(v, w, h).geom;
    case "quote": return quoteGeom(v, w, h).geom;
    case "logowall": return logowallGeom(v, w, h).geom;
    case "bento": return bentoGeom(v, w, h).geom;
    default: return undefined;
  }
};

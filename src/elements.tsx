import React from "react";
import { interpolate } from "remotion";
import { pal } from "./soft";
import { clamp, ease, t } from "./theme";
import type { ResolvedShot, ResolvedVisual } from "./schema";

// Data and structure graphics, so a reel is not only text on cards. Minimal: thin lines, mono
// numbers, one accent for the thing being said, and things arrive on their spoken words.

type Props = { shot: ResolvedShot; time: number; w: number; h: number };
type V<K extends ResolvedVisual["kind"]> = Extract<ResolvedVisual, { kind: K }> & { times?: number[] };

// An element that never arrives (at = Infinity) stays at 0.
const prog = (time: number, at: number, dur = 0.5) => (isFinite(at) ? interpolate(time, [at, at + dur], [0, 1], { ...clamp, easing: ease }) : 0);
const fmt = (n: number, unit = "") => `${unit === "$" ? "$" : ""}${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}${unit && unit !== "$" ? unit : ""}`;

// A bar or line chart. Each point grows or draws on its word; the last (or `highlight`) point takes
// the accent and a large value label. `source` prints small under the chart: charts say where
// their numbers come from, or "Illustration" when they are only a shape.
export const ChartVisual: React.FC<Props & { v: V<"chart"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const n = v.points.length;
  const times = v.times ?? v.points.map((_, i) => shot.start + 0.2 + i * 0.25);
  const hi = v.highlight ?? n - 1;
  const max = Math.max(...v.points.map((p) => p.value)) || 1;
  const titleH = v.title ? 40 : 0;
  const foot = 58;
  const top = titleH + 70;
  const plotH = h - top - foot - 40;
  const plotW = w - 40;
  const enter = prog(time, shot.start, 0.5);
  const y = (val: number) => top + plotH - (val / max) * plotH;
  const p = (i: number) => prog(time, times[i], 0.7);

  return (
    <div style={{ position: "relative", width: w, height: h, opacity: enter, filter: `blur(${(1 - enter) * 8}px)` }}>
      {v.title && (
        <div style={{ position: "absolute", left: 20, top: 0, fontFamily: t.label, fontWeight: 500, fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: c.muted }}>{v.title}</div>
      )}
      {/* Baseline and two faint guides; no boxed axes. */}
      {[0, 0.5, 1].map((g) => (
        <div key={g} style={{ position: "absolute", left: 20, width: plotW, top: top + plotH * (1 - g), height: g === 0 ? 2 : 1, background: g === 0 ? c.ink : c.line }} />
      ))}
      {v.type === "bar"
        ? v.points.map((pt, i) => {
            const slot = plotW / n;
            const bw = Math.min(150, slot * 0.56);
            const x = 20 + slot * i + (slot - bw) / 2;
            const grow = p(i);
            const bh = Math.max(pt.value > 0 ? 6 : 0, (pt.value / max) * plotH * grow);
            const on = i === hi;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: x, width: bw, top: top + plotH - bh, height: bh, background: on ? c.accent : c.ink, opacity: on ? 1 : 0.85, borderRadius: "6px 6px 0 0" }} />
                <div style={{ position: "absolute", left: x - 30, width: bw + 60, top: top + plotH - bh - 66, textAlign: "center", fontFamily: t.label, fontSize: on ? 46 : 38, fontWeight: 600, color: on ? c.accentText : c.ink, opacity: grow }}>
                  {fmt(Number.isInteger(pt.value) ? Math.round(pt.value * grow) : pt.value * grow, v.unit)}
                </div>
                <div style={{ position: "absolute", left: x - 40, width: bw + 80, top: top + plotH + 16, textAlign: "center", fontFamily: t.sans, fontWeight: 700, fontSize: 30, color: c.muted }}>{pt.label}</div>
              </React.Fragment>
            );
          })
        : (() => {
            const xs = v.points.map((_, i) => 20 + 30 + ((plotW - 60 - 260) * i) / Math.max(1, n - 1));
            const pts = v.points.map((pt, i) => `${xs[i]},${y(pt.value)}`).join(" ");
            const draw = interpolate(time, [times[0], times[n - 1] + 0.7], [0, 1], { ...clamp, easing: ease });
            const lastOn = p(hi);
            return (
              <>
                <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                  <polyline points={pts} fill="none" stroke={c.accent} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
                  {v.points.map((pt, i) => (
                    <circle key={i} cx={xs[i]} cy={y(pt.value)} r={i === hi ? 13 : 9} fill={i === hi ? c.accent : c.card} stroke={c.accent} strokeWidth={4} opacity={p(i)} />
                  ))}
                </svg>
                {v.points.map((pt, i) => (
                  <div key={i} style={{ position: "absolute", left: xs[i] - 70, width: 140, top: top + plotH + 16, textAlign: "center", fontFamily: t.label, fontWeight: 500, fontSize: 26, color: c.muted, opacity: p(i) }}>{pt.label}</div>
                ))}
                <div style={{ position: "absolute", left: xs[hi] + 30, top: y(v.points[hi].value) - 40, opacity: lastOn, filter: `blur(${(1 - lastOn) * 6}px)` }}>
                  <div style={{ fontFamily: t.label, fontWeight: 600, fontSize: 64, letterSpacing: -2, color: c.accentText, lineHeight: 1 }}>{fmt(v.points[hi].value, v.unit)}</div>
                  {v.points[hi].note && <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: 26, color: c.muted, marginTop: 8 }}>{v.points[hi].note}</div>}
                </div>
              </>
            );
          })()}
      {v.source && (
        <div style={{ position: "absolute", left: 20, bottom: 0, fontFamily: t.label, fontWeight: 500, fontSize: 22, letterSpacing: 0.5, color: c.muted, opacity: enter }}>{v.source}</div>
      )}
    </div>
  );
};

// A process as a row of numbered stages joined by a track. The track fills to each stage as it is
// named and the current stage takes the accent; unnamed stages wait as dim numbers, an open loop.
export const PipelineVisual: React.FC<Props & { v: V<"pipeline"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const n = v.stages.length;
  // A stage with neither a label nor a word is never reached: it waits as a dim number.
  const times = (v.times ?? v.stages.map((_, i) => shot.start + 0.3 + i * 0.4)).map((x, i) => (v.stages[i].label || v.stages[i].at ? x : Infinity));
  const enter = prog(time, shot.start, 0.5);
  const reached = times.filter((x) => time >= x - 0.05).length;
  const current = reached - 1;
  if (n > 4) return <PipelineColumn {...{ shot, time, w, h, v, times, reached, current, enter }} />;
  const pad = 70;
  const step = (w - pad * 2) / Math.max(1, n - 1);
  const cy = h * 0.42;
  const dot = Math.min(84, step * 0.5);
  // The track fills smoothly from stage to stage.
  const fill = times.reduce((acc, at, i) => (i === 0 || !isFinite(at) ? acc : acc + prog(time, at, 0.6)), 0);
  return (
    <div style={{ position: "relative", width: w, height: h, opacity: enter }}>
      {v.title && (
        <div style={{ position: "absolute", left: 0, right: 0, top: cy - dot / 2 - 150, textAlign: "center", fontFamily: t.label, fontWeight: 500, fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: c.muted }}>{v.title}</div>
      )}
      <div style={{ position: "absolute", left: pad, width: w - pad * 2, top: cy - 1.5, height: 3, background: c.line }} />
      <div style={{ position: "absolute", left: pad, width: step * fill, top: cy - 1.5, height: 3, background: c.ink }} />
      {v.stages.map((st, i) => {
        const x = pad + step * i;
        const on = i === current;
        const done = i < reached;
        const q = prog(time, times[i], 0.45);
        const named = !!st.label;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: x - dot / 2,
                top: cy - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot,
                background: on ? c.accent : done ? c.ink : c.card,
                border: `2px solid ${on ? c.accent : done ? c.ink : c.faint}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: t.label,
                fontWeight: 600,
                fontSize: dot * 0.36,
                color: done ? c.card : c.faint,
                scale: String(on ? 1 + 0.12 * (1 - Math.abs(q - 0.5) * 2) + 0.06 : 1),
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            {named && (
              <div
                style={{
                  position: "absolute",
                  left: x - step / 2 - 20,
                  width: step + 40,
                  top: i % 2 ? cy - dot / 2 - 92 : cy + dot / 2 + 26,
                  textAlign: "center",
                  fontFamily: t.sans,
                  fontWeight: 700,
                  fontSize: Math.min(38, step * 0.24),
                  lineHeight: 1.1,
                  letterSpacing: -0.6,
                  color: on ? c.ink : c.muted,
                  opacity: q,
                  filter: `blur(${(1 - q) * 6}px)`,
                  translate: `0 ${(1 - q) * (i % 2 ? -14 : 14)}px`,
                }}
              >
                {st.label}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// More than four stages stack vertically: numbers on a track at the left, big labels to the right.
const PipelineColumn: React.FC<Props & { v: V<"pipeline">; times: number[]; reached: number; current: number; enter: number }> = ({ shot, time, w, h, v, times, reached, current, enter }) => {
  const c = pal(shot.tone);
  const n = v.stages.length;
  const head = v.title ? 56 : 0;
  const gap = Math.min(150, (h - head - 20) / n);
  const dot = Math.min(76, gap * 0.62);
  const top = head + (h - head - gap * n) / 2 + gap / 2;
  const x = Math.max(40, w * 0.16);
  const fill = times.reduce((acc, at, i) => (i === 0 || !isFinite(at) ? acc : acc + prog(time, at, 0.6)), 0);
  return (
    <div style={{ position: "relative", width: w, height: h, opacity: enter }}>
      {v.title && <div style={{ position: "absolute", left: x - dot / 2, top: 0, fontFamily: t.label, fontWeight: 500, fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: c.muted }}>{v.title}</div>}
      <div style={{ position: "absolute", left: x - 1.5, top, width: 3, height: gap * (n - 1), background: c.line }} />
      <div style={{ position: "absolute", left: x - 1.5, top, width: 3, height: gap * fill, background: c.ink }} />
      {v.stages.map((st, i) => {
        const y = top + gap * i;
        const on = i === current;
        const done = i < reached;
        const q = prog(time, times[i], 0.45);
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x - dot / 2, top: y - dot / 2, width: dot, height: dot, borderRadius: dot, background: on ? c.accent : done ? c.ink : c.card, border: `2px solid ${on ? c.accent : done ? c.ink : c.faint}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.label, fontWeight: 600, fontSize: dot * 0.36, color: done ? c.card : c.faint }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            {st.label && (
              <div style={{ position: "absolute", left: x + dot / 2 + 36, top: y, translate: `${(1 - q) * 24}px -50%`, fontFamily: t.sans, fontWeight: 700, fontSize: Math.min(58, gap * 0.42), letterSpacing: -1.2, color: on ? c.ink : c.muted, opacity: q, filter: `blur(${(1 - q) * 6}px)`, whiteSpace: "nowrap" }}>
                {st.label}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

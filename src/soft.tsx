import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { clamp, ease, t } from "./theme";
import type { ResolvedShot, ResolvedVisual } from "./schema";

// Soft tech v2: warm ink and paper with grain, one flat warm accent, real content in every graphic.
// No glow and no gradient backgrounds: depth comes from real shadows and layering only.
// The accent is a deep vermilion, the classic print spot colour. It reads on paper and on near-black,
// it is warm without being the clay orange of Claude's own brand, and it is used on type, lines,
// dots and chips only, never as light.
export type Tone = "light" | "dark";
export type Pal = { bg: string; card: string; chip: string; ink: string; muted: string; faint: string; line: string; accent: string; shadow: string };

export const ACCENT = "#D4452B";
export const pal = (tone: Tone = "light"): Pal =>
  tone === "dark"
    ? {
        bg: "#141413",
        card: "#1F1E1C",
        chip: "#2A2926",
        ink: "#F2F0EB",
        muted: "#8F8C84",
        faint: "#45433E",
        line: "rgba(242,240,235,0.10)",
        accent: ACCENT,
        shadow: "0 1px 2px rgba(0,0,0,0.45), 0 18px 44px rgba(0,0,0,0.55)",
      }
    : {
        bg: "#F2F0EB",
        card: "#FBFAF7",
        chip: "#E7E4DC",
        ink: "#141413",
        muted: "#75736C",
        faint: "#CFCCC4",
        line: "rgba(20,20,19,0.10)",
        accent: ACCENT,
        shadow: "0 1px 2px rgba(20,20,19,0.06), 0 14px 36px rgba(20,20,19,0.12)",
      };

// Scene geometry: the headline on top, the visual below, captions low.
export const SCENE = { headTop: 96, headHeight: 340, top: 470, bottom: 1600, caption: 1752 };
// Headlines are large: 150 px for a short line, 126 px when it needs two.
export const headlineSize = (text: string) => (text.replace(/\*/g, "").length > 12 ? 126 : 150);

type Props = { slug: string; shot: ResolvedShot; time: number; w: number; h: number };
type V<K extends ResolvedVisual["kind"]> = Extract<ResolvedVisual, { kind: K }> & { times?: number[] };
export type Box = { x: number; y: number; w: number; h: number; r: number };

const src = (slug: string, p: string) => (/^https?:/.test(p) ? p : staticFile(`${slug}/${p}`));
const prog = (time: number, at: number, dur = 0.45) => interpolate(time, [at, at + dur], [0, 1], { ...clamp, easing: ease });

// The scene background: flat warm colour with fine film grain. Nothing else.
export const SceneCanvas: React.FC<{ tone: Tone; time: number }> = ({ tone, time }) => {
  const c = pal(tone);
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <AbsoluteFill style={{ opacity: tone === "dark" ? 0.09 : 0.05, mixBlendMode: tone === "dark" ? "screen" : "multiply" }}>
        <svg width="100%" height="100%">
          <filter id={`grain-${tone}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(time * 12) % 50} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${tone})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Text with *one accent* in Signifier italic, in the accent colour.
export const SoftAccented: React.FC<{ text: string; c: Pal }> = ({ text, c }) => (
  <>
    {text.split(/(\*[^*]+\*)/).map((part, i) =>
      part.startsWith("*") ? (
        <span key={i} style={{ fontFamily: t.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: -0.5, color: c.accent }}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

// An odometer: each digit is a column of 0 to 9 that rolls to its place as the value climbs.
const Odometer: React.FC<{ value: string; p: number; size: number; c: Pal }> = ({ value, p, size, c }) => {
  const m = value.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!m) return <span>{value}</span>;
  const digits = m[2].replace(/,/g, "");
  const v = parseInt(digits, 10) * p;
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", fontFamily: t.sans, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.04, color: c.ink, fontVariantNumeric: "tabular-nums" }}>
      {m[1]}
      {digits.split("").map((_, i) => {
        const k = digits.length - 1 - i;
        const pos = (v / Math.pow(10, k)) % 10;
        const shown = v >= Math.pow(10, k) || k === 0 ? 1 : 0;
        return (
          <span key={i} style={{ display: "inline-block", height: size, overflow: "hidden", opacity: shown, width: size * 0.6 }}>
            <span style={{ display: "flex", flexDirection: "column", translate: `0 ${-pos * size}px` }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, j) => (
                <span key={j} style={{ height: size, display: "block", textAlign: "center" }}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
      <span style={{ fontFamily: t.serif, fontStyle: "italic", fontWeight: 400, color: c.accent, marginLeft: size * 0.04 }}>{m[3]}</span>
    </span>
  );
};

// Grid geometry, shared by the grid and by a transition that grows one of its tiles.
const gridGeom = (v: V<"grid">, w: number, h: number) => {
  const n = v.items.length;
  const head = v.count ? 290 : v.groups.length ? 130 : 0;
  const gap = 18;
  const tile = (w - gap * (v.cols - 1)) / v.cols;
  const tileH = tile * (9 / 16);
  const rows = Math.ceil(n / v.cols);
  const gridH = rows * tileH + Math.max(0, rows - 1) * gap;
  const top = n ? head + Math.max(30, (h - head - gridH) / 2) : 0;
  const box = (i: number): Box => ({ x: (i % v.cols) * (tile + gap), y: top + Math.floor(i / v.cols) * (tileH + gap), w: tile, h: tileH, r: 14 });
  return { head, box };
};
export const gridTileBox = (v: ResolvedVisual, w: number, h: number, i: number): Box | undefined =>
  v.kind === "grid" ? gridGeom(v as V<"grid">, w, h).box(i) : undefined;

// A library that fills in with its real thumbnails. Tiles arrive in a wave from the top left, the
// count rolls up, and each group lights its tiles on its word while the rest step back.
export const GridVisual: React.FC<Props & { v: V<"grid"> }> = ({ slug, shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const times = v.times ?? [shot.start];
  const at = v.at ? times[0] : shot.start;
  const groupTimes = v.groups.map((_, i) => times[1 + i] ?? shot.start + 0.3 + i * 0.5);
  const active = groupTimes.filter((g) => time >= g).length - 1;
  const g = gridGeom(v, w, h);
  const roll = interpolate(time, [at, at + 1.2], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  const noItems = v.items.length === 0;
  const labelTop = noItems ? h / 2 + 140 : v.count ? 205 : 0;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.count && (
        <div style={{ position: "absolute", top: noItems ? h / 2 - 220 : 0, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: prog(time, at, 0.3) }}>
          <Odometer value={v.count} p={roll} size={noItems ? 300 : 180} c={c} />
          {v.label && <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: 30, letterSpacing: 8, paddingLeft: 8, textTransform: "uppercase", color: c.muted }}>{v.label}</div>}
        </div>
      )}
      {v.groups.length > 0 && (
        <div style={{ position: "absolute", top: labelTop, left: 0, right: 0, height: noItems ? 120 : v.count ? 80 : g.head, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {v.groups.map((gr, i) => {
            const p = prog(time, groupTimes[i], 0.4);
            const out = i < active ? prog(time, groupTimes[i + 1], 0.2) : 0;
            const o = p * (1 - out);
            if (o <= 0) return null;
            return (
              <div key={i} style={{ position: "absolute", padding: noItems ? "22px 52px" : "12px 34px", borderRadius: 60, background: c.accent, color: "#FBFAF7", fontFamily: noItems ? t.mono : t.sans, fontWeight: 700, fontSize: noItems ? 64 : 44, letterSpacing: noItems ? 0 : -1, opacity: o, filter: `blur(${(1 - o) * 10}px)` }}>
                {gr.label}
              </div>
            );
          })}
        </div>
      )}
      {v.items.map((item, i) => {
        const b = g.box(i);
        const row = Math.floor(i / v.cols);
        const col = i % v.cols;
        const p = prog(time, at + 0.05 + (row + col) * 0.07, 0.5);
        const inGroup = active >= 0 && v.groups[active].tiles.includes(i);
        const lit = inGroup ? prog(time, groupTimes[active], 0.3) : 0;
        const dim = active >= 0 && !inGroup ? 0.3 : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              borderRadius: b.r,
              overflow: "hidden",
              background: c.card,
              boxShadow: c.shadow,
              outline: lit > 0.3 ? `4px solid ${c.accent}` : "none",
              outlineOffset: 4,
              opacity: p * dim,
              filter: `blur(${(1 - p) * 8}px)`,
            }}
          >
            <Img src={src(slug, item)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        );
      })}
    </div>
  );
};

type Pt = { x: number; y: number };
const bez = (a: Pt, b: Pt, cc: Pt, d: Pt, u: number): Pt => {
  const m = 1 - u;
  return {
    x: m * m * m * a.x + 3 * m * m * u * b.x + 3 * m * u * u * cc.x + u * u * u * d.x,
    y: m * m * m * a.y + 3 * m * m * u * b.y + 3 * m * u * u * cc.y + u * u * u * d.y,
  };
};

// Funnel geometry, shared with a transition that grows the result card.
const funnelGeom = (v: V<"funnel">, w: number, h: number) => {
  const n = v.items.length;
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const chipW = cols === 1 ? 520 : cols === 2 ? 440 : 296;
  const chipH = 92;
  const rowGap = 120;
  const solo = n === 0;
  const lines = v.target.lines.length;
  const rowH = solo ? 104 : 86;
  const cardW = solo ? w : Math.min(w, 820);
  const cardH = (solo ? 230 : 180) + lines * rowH;
  const cardTop = solo ? Math.max(0, (h - cardH) / 2) : Math.max(rows * rowGap + 240, h - cardH - 10);
  const card: Box = { x: (w - cardW) / 2, y: cardTop, w: cardW, h: cardH, r: 34 };
  const colGap = cols > 1 ? (w - chipW * cols) / (cols - 1) : 0;
  const chips = v.items.map((_, i) => {
    const r = Math.floor(i / cols);
    const k = i % cols;
    const inRow = Math.min(cols, n - r * cols);
    const offset = ((cols - inRow) * (chipW + colGap)) / 2;
    return { x: cols === 1 ? (w - chipW) / 2 : offset + k * (chipW + colGap), y: r * rowGap };
  });
  return { n, chipW, chipH, card, chips, solo, rowH };
};
export const funnelCardBox = (v: ResolvedVisual, w: number, h: number): Box | undefined =>
  v.kind === "funnel" ? funnelGeom(v as V<"funnel">, w, h).card : undefined;

// Many sources into one result. Chips of plain words land, lines draw from each into the result
// card, dots travel down them, and the card's rows land on their words. No items: the card alone.
export const FunnelVisual: React.FC<Props & { v: V<"funnel"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const g = funnelGeom(v, w, h);
  const times = v.times ?? [];
  const itemT = v.items.map((_, i) => times[i] ?? shot.start + i * 0.1);
  const flowT = v.at ? times[g.n] : g.n ? itemT[g.n - 1] + 0.35 : shot.start;
  const lineT = v.target.lines.map((_, i) => times[g.n + 1 + i] ?? flowT + 0.5 + i * 0.3);
  const reached = g.n ? prog(time, flowT + 0.55, 0.3) : 1;
  const card = g.card;
  const paths = g.chips.map((ch) => {
    const a = { x: ch.x + g.chipW / 2, y: ch.y + g.chipH };
    const d = { x: card.x + card.w / 2, y: card.y };
    return [a, { x: a.x, y: a.y + 160 }, { x: d.x, y: d.y - 200 }, d] as [Pt, Pt, Pt, Pt];
  });
  const big = g.solo;
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {paths.map(([a, b, cc, d], i) => {
          const draw = prog(time, flowT + i * 0.04, 0.6);
          if (draw <= 0) return null;
          return <path key={i} d={`M${a.x} ${a.y} C${b.x} ${b.y} ${cc.x} ${cc.y} ${d.x} ${d.y}`} pathLength={1} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - draw} />;
        })}
      </svg>
      {paths.map((pts, i) => {
        const since = time - (flowT + i * 0.04 + 0.6);
        if (since < 0) return null;
        const u = (since / 1.4 + i * 0.13) % 1;
        const q = bez(...pts, u);
        return <div key={i} style={{ position: "absolute", left: q.x - 7, top: q.y - 7, width: 14, height: 14, borderRadius: 7, background: c.accent, opacity: Math.min(1, since * 3) * Math.sin(u * Math.PI) }} />;
      })}
      {g.chips.map((ch, i) => {
        const p = prog(time, itemT[i], 0.45);
        return (
          <div key={i} style={{ position: "absolute", left: ch.x, top: ch.y, width: g.chipW, height: g.chipH, borderRadius: g.chipH / 2, background: c.card, boxShadow: c.shadow, display: "flex", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: t.sans, fontWeight: 700, fontSize: 34, letterSpacing: -0.5, color: c.ink, opacity: p, filter: `blur(${(1 - p) * 8}px)` }}>
            <div style={{ width: 12, height: 12, borderRadius: 6, background: c.accent }} />
            {v.items[i].text}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: card.x,
          top: card.y,
          width: card.w,
          height: card.h,
          borderRadius: card.r,
          background: c.card,
          border: `${reached > 0.5 && g.n ? 3 : 1.5}px solid ${reached > 0.5 && g.n ? c.accent : c.line}`,
          boxShadow: c.shadow,
          padding: big ? "48px 60px" : "36px 46px",
          boxSizing: "border-box",
          opacity: g.n ? prog(time, Math.min(flowT, itemT[0] + 0.2), 0.5) : 1,
        }}
      >
        {v.target.kicker && <div style={{ fontFamily: t.mono, fontSize: big ? 34 : 28, color: c.accent }}>{v.target.kicker}</div>}
        <div style={{ marginTop: 10, fontFamily: t.sans, fontWeight: 700, fontSize: big ? 84 : 64, lineHeight: 1.05, letterSpacing: big ? -3 : -2, color: c.ink }}>
          <SoftAccented text={v.target.title} c={c} />
        </div>
        <div style={{ marginTop: big ? 34 : 24, display: "flex", flexDirection: "column" }}>
          {v.target.lines.map((ln, i) => {
            const q = prog(time, lineT[i], 0.4);
            const now = i === lineT.filter((x) => time >= x).length - 1;
            return (
              <div key={i} style={{ height: g.rowH, display: "flex", alignItems: "center", gap: 24, borderTop: `1px solid ${c.line}`, opacity: q, filter: `blur(${(1 - q) * 6}px)` }}>
                <div style={{ flex: "none", width: big ? 18 : 14, height: big ? 18 : 14, borderRadius: 10, background: now ? c.accent : c.faint }} />
                <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: big ? 60 : 48, letterSpacing: -1.2, color: now ? c.ink : c.muted }}>
                  <SoftAccented text={ln.text} c={c} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Kinetic typing geometry, shared with a transition that grows the input.
const typeGeom = (v: V<"type">, w: number, h: number) => {
  const inputH = 170 + (v.chips.length ? 100 : 0);
  const inputTop = h / 2 - inputH / 2 + 60;
  return { inputH, inputTop, input: { x: 0, y: inputTop, w, h: inputH, r: 46 } as Box };
};
export const typeInputBox = (v: ResolvedVisual, w: number, h: number): Box | undefined =>
  v.kind === "type" ? typeGeom(v as V<"type">, w, h).input : undefined;

// Kinetic typing. The text types itself huge across the frame, then on `settle` shrinks toward a
// plain input and dissolves as the same words resolve inside it; pasted chips pop in after.
export const TypeVisual: React.FC<Props & { v: V<"type"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const times = v.times ?? [];
  const at = v.at ? times[0] : shot.start + 0.1;
  const cps = 16;
  const typedEnd = at + v.text.length / cps;
  const settleAt = v.settle ? Math.max(times[1], typedEnd + 0.15) : typedEnd + 0.5;
  const chipT = v.chips.map((_, i) => times[2 + i] ?? settleAt + 0.4 + i * 0.25);
  const shown = v.text.slice(0, Math.max(0, Math.floor((time - at) * cps)));
  const s = interpolate(time, [settleAt, settleAt + 0.7], [0, 1], { ...clamp, easing: ease });
  const big = Math.min(230, Math.max(110, (w * 2.6) / Math.max(4, v.text.length) / 0.56));
  const lines = Math.ceil((v.text.length * 0.56 * big) / w);
  const { inputH, inputTop } = typeGeom(v, w, h);
  const out = interpolate(s, [0, 0.6], [0, 1], clamp);
  const into = interpolate(s, [0.35, 1], [0, 1], clamp);
  const bigTop = h / 2 - (lines * big * 1.02) / 2 - 40;
  const caret = Math.floor(time * 2.4) % 2 === 0 || (time >= at && time < typedEnd);
  const sent = v.chips.length ? prog(time, chipT[chipT.length - 1] + 0.4, 0.3) : prog(time, settleAt + 0.8, 0.3);
  const typed = (text: string) =>
    text.split(/(\/\S+)/).map((part, i) => (part.startsWith("/") ? <span key={i} style={{ color: c.accent }}>{part}</span> : <React.Fragment key={i}>{part}</React.Fragment>));
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.label && (
        <div style={{ position: "absolute", left: 0, right: 0, top: inputTop - 90, textAlign: "center", fontFamily: t.sans, fontWeight: 500, fontSize: 30, letterSpacing: 8, paddingLeft: 8, textTransform: "uppercase", color: c.muted, opacity: s }}>
          {v.label}
        </div>
      )}
      <div style={{ position: "absolute", left: 0, top: inputTop, width: w, height: inputH, borderRadius: 46, background: c.card, border: `1.5px solid ${c.line}`, boxShadow: c.shadow, opacity: s, filter: `blur(${(1 - s) * 10}px)` }}>
        <div style={{ position: "absolute", left: 44, top: 34, display: "flex", gap: 14 }}>
          {v.chips.map((ch, i) => {
            const p = prog(time, chipT[i], 0.35);
            return (
              <div key={i} style={{ height: 70, borderRadius: 18, padding: "0 26px", display: "flex", alignItems: "center", gap: 14, background: c.chip, color: c.ink, fontFamily: t.sans, fontWeight: 700, fontSize: 32, opacity: p, filter: `blur(${(1 - p) * 6}px)` }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: c.accent }} />
                {ch.text}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", right: 32, bottom: 32, width: 80, height: 80, borderRadius: 40, background: sent > 0.5 ? c.accent : c.faint, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FBFAF7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>
      </div>
      <div style={{ position: "absolute", left: 48, right: 140, top: inputTop + inputH - 122, fontFamily: t.sans, fontWeight: 700, fontSize: 56, letterSpacing: -1.2, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", opacity: into, filter: `blur(${(1 - into) * 8}px)` }}>
        {typed(v.text)}
      </div>
      {out < 1 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: bigTop,
            width: w,
            transformOrigin: "50% 100%",
            scale: String(1 - 0.45 * out),
            translate: `0 ${out * (inputTop - bigTop - lines * big * 0.6)}px`,
            opacity: 1 - out,
            filter: `blur(${out * 16}px)`,
            fontFamily: t.sans,
            fontWeight: 700,
            fontSize: big,
            lineHeight: 1.02,
            letterSpacing: -big * 0.04,
            color: c.ink,
            whiteSpace: "pre-wrap",
          }}
        >
          {typed(shown)}
          <span style={{ display: "inline-block", width: big * 0.07, height: big * 0.86, marginLeft: big * 0.04, translate: `0 ${big * 0.12}px`, background: c.accent, borderRadius: 4, opacity: caret ? 1 : 0 }} />
        </div>
      )}
    </div>
  );
};

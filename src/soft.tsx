import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { clamp, ease, t } from "./theme";
import type { ResolvedShot, ResolvedVisual } from "./schema";

// Soft tech: a calm product-film look for full-frame scenes. Light and dark scenes alternate for
// rhythm. One accent, a quiet periwinkle blue: it sits in the same family as the house cobalt, it
// glows on near-black without turning neon, and it stays clear of the brands these reels name.
export type Tone = "light" | "dark";
export type Pal = { bg: string; card: string; ink: string; muted: string; faint: string; line: string; accent: string; accentInk: string; tint: string; glow: string; shadow: string };

const ACCENT = "#5468E0";
export const pal = (tone: Tone = "light"): Pal =>
  tone === "dark"
    ? {
        bg: "#08090B",
        card: "#131418",
        ink: "#F3F2EE",
        muted: "#8B8E98",
        faint: "#3A3C44",
        line: "rgba(255,255,255,0.09)",
        accent: ACCENT,
        accentInk: "#9AA8FF",
        tint: "rgba(84,104,224,0.22)",
        glow: "rgba(84,104,224,0.42)",
        shadow: "0 2px 6px rgba(0,0,0,0.3), 0 24px 60px rgba(0,0,0,0.55)",
      }
    : {
        bg: "#F5F4F0",
        card: "#FFFFFF",
        ink: "#111214",
        muted: "#7A7D85",
        faint: "#C9C8C2",
        line: "rgba(17,18,20,0.08)",
        accent: ACCENT,
        accentInk: ACCENT,
        tint: "rgba(84,104,224,0.12)",
        glow: "rgba(84,104,224,0.07)",
        shadow: "0 2px 4px rgba(20,20,30,0.04), 0 18px 50px rgba(20,20,30,0.10)",
      };

// Scene geometry: the headline on top, the visual below, captions low.
export const SCENE = { headTop: 120, headHeight: 300, top: 440, bottom: 1580, caption: 1730 };

type Props = { slug: string; shot: ResolvedShot; time: number; w: number; h: number };
type V<K extends ResolvedVisual["kind"]> = Extract<ResolvedVisual, { kind: K }> & { times?: number[] };

const prog = (time: number, at: number, dur = 0.45) => interpolate(time, [at, at + dur], [0, 1], { ...clamp, easing: ease });
// A small deterministic random, so every render of a frame is identical.
const rnd = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// The scene background. Light: warm white with a faint accent bloom low in the frame.
// Dark: near-black with one soft accent glow that breathes slowly behind the visual.
export const SceneCanvas: React.FC<{ tone: Tone; time: number; start: number }> = ({ tone, time, start }) => {
  const c = pal(tone);
  const p = prog(time, start, 1.2);
  const drift = Math.sin((time - start) * 0.6) * 30;
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${tone === "dark" ? "70% 42%" : "110% 50%"} at ${50 + drift / 20}% ${tone === "dark" ? 60 : 85}%, ${c.glow}, transparent 70%)`,
          opacity: 0.6 + 0.4 * p,
          scale: String(0.92 + 0.08 * p),
        }}
      />
      {tone === "light" && (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255,255,255,0.9), transparent 70%)" }} />
      )}
      {/* Fine grain keeps flat colour from banding and makes the frame feel filmed. */}
      <AbsoluteFill style={{ opacity: tone === "dark" ? 0.07 : 0.035, mixBlendMode: tone === "dark" ? "screen" : "multiply" }}>
        <svg width="100%" height="100%">
          <filter id={`grain-${tone}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(time * 12) % 50} />
          </filter>
          <rect width="100%" height="100%" filter={`url(#grain-${tone})`} />
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Text with *one accent* in Signifier italic; on scenes the accent word takes the accent tint.
export const SoftAccented: React.FC<{ text: string; c: Pal }> = ({ text, c }) => (
  <>
    {text.split(/(\*[^*]+\*)/).map((part, i) =>
      part.startsWith("*") ? (
        <span key={i} style={{ fontFamily: t.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: -0.5, color: c.accentInk }}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

// An odometer: each digit is a column of 0 to 9 that rolls to its place as the value climbs.
const Odometer: React.FC<{ value: string; p: number; size: number; color: string }> = ({ value, p, size, color }) => {
  const m = value.match(/^([^\d]*)([\d,]+)(.*)$/);
  if (!m) return <span>{value}</span>;
  const digits = m[2].replace(/,/g, "");
  const target = parseInt(digits, 10);
  const v = target * p;
  const places = digits.length;
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start", fontFamily: t.sans, fontWeight: 700, fontSize: size, lineHeight: 1, letterSpacing: -size * 0.04, color, fontVariantNumeric: "tabular-nums" }}>
      {m[1]}
      {digits.split("").map((_, i) => {
        const k = places - 1 - i;
        const pos = (v / Math.pow(10, k)) % 10;
        // Leading zeros stay hidden until the value reaches them.
        const shown = v >= Math.pow(10, k) || k === 0 ? 1 : 0;
        return (
          <span key={i} style={{ display: "inline-block", height: size, overflow: "hidden", opacity: shown, width: size * 0.6, maskImage: "linear-gradient(transparent, black 22%, black 78%, transparent)" }}>
            <span style={{ display: "flex", flexDirection: "column", translate: `0 ${-pos * size}px` }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, j) => (
                <span key={j} style={{ height: size, display: "block", textAlign: "center" }}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
      <span style={{ fontFamily: t.serif, fontStyle: "italic", fontWeight: 400, color: pal().accent, marginLeft: size * 0.04 }}>{m[3]}</span>
    </span>
  );
};

// An abstract moving thumbnail: a soft shape drifting on a tinted card, so a tile reads as
// "an animated video" without pretending to be any particular one.
const Thumb: React.FC<{ i: number; time: number; c: Pal; size: number; on: number }> = ({ i, time, c, size, on }) => {
  const kind = Math.floor(rnd(i, 1) * 4);
  const phase = rnd(i, 2) * Math.PI * 2;
  const s = Math.sin(time * 1.6 + phase);
  const hue = rnd(i, 3);
  const shape = { position: "absolute" as const, background: hue > 0.55 ? c.accent : c.ink, opacity: hue > 0.55 ? 0.85 : 0.18 + on * 0.1 };
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: size * 0.16 }}>
      {kind === 0 && <div style={{ ...shape, width: size * 0.34, height: size * 0.34, borderRadius: size, left: size * (0.33 + 0.14 * s), top: size * 0.3 }} />}
      {kind === 1 && [0, 1, 2].map((b) => (
        <div key={b} style={{ ...shape, width: size * 0.13, borderRadius: 4, left: size * (0.25 + b * 0.19), bottom: size * 0.24, height: size * (0.18 + 0.22 * (0.5 + 0.5 * Math.sin(time * 2 + phase + b))) }} />
      ))}
      {kind === 2 && <div style={{ ...shape, width: size * 0.5, height: size * 0.08, borderRadius: size, left: size * 0.25, top: size * (0.46 + 0.1 * s), scale: `${0.6 + 0.4 * (0.5 + 0.5 * s)} 1` }} />}
      {kind === 3 && <div style={{ ...shape, width: size * 0.3, height: size * 0.3, borderRadius: size * 0.08, left: size * 0.35, top: size * 0.33, rotate: `${(time * 40 + phase * 30) % 360}deg` }} />}
    </div>
  );
};

// A library that fills in. Tiles arrive in a wave from the centre, the count rolls up, and each
// group lights its tiles on its word while the rest dim.
export const GridVisual: React.FC<Props & { v: V<"grid"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const times = v.times ?? [shot.start];
  const at = v.at ? times[0] : shot.start;
  const groupTimes = v.groups.map((_, i) => times[1 + i]);
  const active = groupTimes.filter((g) => time >= g).length - 1;
  const head = v.count ? 250 : v.groups.length ? 110 : 0;
  const gap = v.style === "chip" ? 22 : 18;
  const tile = (w - gap * (v.cols - 1)) / v.cols;
  const tileH = v.style === "chip" ? tile * 0.42 : tile;
  const rows = Math.ceil(v.tiles / v.cols);
  const gridH = rows * tileH + (rows - 1) * gap;
  const top = head + Math.max(0, (h - head - gridH) / 2);
  const cx = (v.cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const roll = interpolate(time, [at, at + 1.6], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 3) });
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.count && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: prog(time, at, 0.4) }}>
          <Odometer value={v.count} p={roll} size={170} color={c.ink} />
          {v.label && <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: 30, letterSpacing: 8, paddingLeft: 8, textTransform: "uppercase", color: c.muted }}>{v.label}</div>}
        </div>
      )}
      {!v.count && v.groups.length > 0 && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: head, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {v.groups.map((g, i) => {
            const p = prog(time, groupTimes[i], 0.4);
            const out = i < active ? prog(time, groupTimes[i + 1], 0.25) : 0;
            const o = p * (1 - out);
            if (o <= 0) return null;
            return (
              <div key={i} style={{ position: "absolute", padding: "16px 40px", borderRadius: 50, background: c.card, border: `1.5px solid ${c.accent}`, boxShadow: c.shadow, fontFamily: t.sans, fontWeight: 700, fontSize: 52, letterSpacing: -1, color: c.ink, opacity: o, filter: `blur(${(1 - o) * 10}px)`, scale: String(0.94 + 0.06 * o) }}>
                {g.label}
              </div>
            );
          })}
        </div>
      )}
      {Array.from({ length: v.tiles }, (_, i) => {
        const r = Math.floor(i / v.cols);
        const col = i % v.cols;
        const dist = Math.hypot(col - cx, r - cy);
        const p = prog(time, at + 0.05 + dist * 0.09 + rnd(i, 9) * 0.08, 0.55);
        const inGroup = active >= 0 && v.groups[active].tiles.includes(i);
        const lit = inGroup ? prog(time, groupTimes[active], 0.35) : 0;
        const dim = active >= 0 && !inGroup ? 0.35 : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: col * (tile + gap),
              top: top + r * (tileH + gap),
              width: tile,
              height: tileH,
              borderRadius: v.style === "chip" ? tileH / 2 : tile * 0.16,
              background: lit > 0.5 ? c.card : v.style === "chip" ? c.card : shot.tone === "dark" ? "#16171C" : "#ECEBE6",
              border: `${1.5 + lit * 1.5}px solid ${lit > 0.3 ? c.accent : c.line}`,
              boxShadow: lit > 0.3 ? `0 0 0 6px ${c.tint}, ${c.shadow}` : "none",
              opacity: p * (dim + (1 - dim) * (1 - prog(time, groupTimes[Math.max(0, active)] ?? 0, 0.3))),
              filter: `blur(${(1 - p) * 8}px)`,
              scale: String((0.86 + 0.14 * p) * (1 + 0.04 * lit)),
              boxSizing: "border-box",
            }}
          >
            {v.style === "thumb" ? (
              <Thumb i={i} time={time} c={c} size={tile} on={lit} />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: tileH * 0.16, padding: `0 ${tileH * 0.3}px` }}>
                <div style={{ flex: "none", width: tileH * 0.24, height: tileH * 0.24, borderRadius: tileH, background: lit > 0.3 ? c.accent : c.faint }} />
                {/* A chip shows its name only when its group names it; the rest stay blank, never invented. */}
                {lit > 0.3 ? (
                  <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: tileH * 0.32, letterSpacing: -1, color: c.ink, whiteSpace: "nowrap" }}>{v.groups[active].label}</div>
                ) : (
                  <div style={{ height: tileH * 0.1, borderRadius: tileH, background: c.faint, opacity: 0.6, width: `${40 + rnd(i, 5) * 35}%` }} />
                )}
              </div>
            )}
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

// A link chip: a link glyph and a soft placeholder bar, or a short label when one is given.
const LinkChip: React.FC<{ text?: string; c: Pal; i: number; width: number }> = ({ text, c, i, width }) => (
  <div style={{ width, height: 96, borderRadius: 48, background: c.card, border: `1px solid ${c.line}`, boxShadow: c.shadow, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", boxSizing: "border-box" }}>
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={c.accentInk} strokeWidth="2.4" strokeLinecap="round">
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </svg>
    {text ? (
      <div style={{ fontFamily: t.mono, fontSize: 32, color: c.ink, whiteSpace: "nowrap", overflow: "hidden" }}>{text}</div>
    ) : (
      <div style={{ height: 14, borderRadius: 7, background: c.faint, width: `${45 + rnd(i, 4) * 40}%` }} />
    )}
  </div>
);

// Many sources into one result. Link chips land in a loose cloud, lines draw from each into the
// result card, dots keep travelling down them, and the card's rows land on their words.
export const FunnelVisual: React.FC<Props & { v: V<"funnel"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const n = v.items.length;
  const times = v.times ?? [];
  const itemT = v.items.map((_, i) => times[i] ?? shot.start + i * 0.1);
  const flowT = v.at ? times[n] : itemT[n - 1] + 0.35;
  const lineT = v.target.lines.map((_, i) => times[n + 1 + i] ?? flowT + 0.5 + i * 0.3);
  const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const chipW = cols === 1 ? 560 : cols === 2 ? 440 : 300;
  const colGap = (w - chipW * cols) / Math.max(1, cols - 1);
  const chipTop = 0;
  const rowGap = 124;
  const cardW = Math.min(w, 820);
  const lines = v.target.lines.length;
  const cardH = 170 + lines * 88;
  const cardTop = Math.max(rows * rowGap + 230, h - cardH - 10);
  const card = { x: (w - cardW) / 2, y: cardTop, w: cardW, h: cardH };
  const chips = v.items.map((_, i) => {
    const r = Math.floor(i / cols);
    const k = i % cols;
    const inRow = Math.min(cols, n - r * cols);
    const offset = ((cols - inRow) * (chipW + colGap)) / 2;
    const x = cols === 1 ? (w - chipW) / 2 : offset + k * (chipW + colGap) + (r % 2 ? 18 : -18) * (cols > 1 ? 1 : 0);
    return { x: Math.max(0, Math.min(w - chipW, x)), y: chipTop + r * rowGap };
  });
  const reached = prog(time, flowT + 0.55, 0.4);
  const paths = chips.map((ch) => {
    const a = { x: ch.x + chipW / 2, y: ch.y + 96 };
    const d = { x: card.x + card.w / 2, y: card.y };
    return [a, { x: a.x, y: a.y + 160 }, { x: d.x, y: d.y - 200 }, d] as [Pt, Pt, Pt, Pt];
  });
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {paths.map(([a, b, cc, d], i) => {
          const draw = prog(time, flowT + i * 0.04, 0.6);
          if (draw <= 0) return null;
          return (
            <path key={i} d={`M${a.x} ${a.y} C${b.x} ${b.y} ${cc.x} ${cc.y} ${d.x} ${d.y}`} pathLength={1} fill="none" stroke={c.accent} strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          );
        })}
      </svg>
      {/* Dots keep travelling down every line once it is drawn: the work flowing in. */}
      {paths.map((pts, i) => {
        const since = time - (flowT + i * 0.04 + 0.6);
        if (since < 0) return null;
        return [0, 0.5].map((off) => {
          const u = ((since / 1.3 + rnd(i, 6) + off) % 1 + 1) % 1;
          const p = bez(...pts, u);
          return <div key={`${i}-${off}`} style={{ position: "absolute", left: p.x - 7, top: p.y - 7, width: 14, height: 14, borderRadius: 7, background: c.accent, boxShadow: `0 0 14px ${c.glow}`, opacity: Math.min(1, since * 3) * Math.sin(u * Math.PI) }} />;
        });
      })}
      {chips.map((ch, i) => {
        const p = prog(time, itemT[i], 0.45);
        return (
          <div key={i} style={{ position: "absolute", left: ch.x, top: ch.y, opacity: p, filter: `blur(${(1 - p) * 8}px)`, translate: `0 ${(1 - p) * -30}px` }}>
            <LinkChip text={v.items[i].text} c={c} i={i} width={chipW} />
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
          borderRadius: 34,
          background: c.card,
          border: `${1.5 + reached * 1.5}px solid ${reached > 0.5 ? c.accent : c.line}`,
          boxShadow: `0 0 0 ${reached * 10}px ${c.tint}, ${c.shadow}`,
          padding: "34px 44px",
          boxSizing: "border-box",
          opacity: prog(time, Math.min(flowT, itemT[0] + 0.2), 0.5),
        }}
      >
        {v.target.kicker && <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: c.muted }}>{v.target.kicker}</div>}
        <div style={{ marginTop: 8, fontFamily: t.sans, fontWeight: 700, fontSize: 64, letterSpacing: -2, color: c.ink }}>
          <SoftAccented text={v.target.title} c={c} />
        </div>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 28 }}>
          {v.target.lines.map((ln, i) => {
            const q = prog(time, lineT[i], 0.4);
            const now = i === lineT.filter((x) => time >= x).length - 1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: q, filter: `blur(${(1 - q) * 6}px)`, translate: `${(1 - q) * 24}px 0` }}>
                <div style={{ flex: "none", width: 42, height: 42, borderRadius: 21, background: now ? c.accent : c.tint, color: now ? "#fff" : c.accentInk, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.sans, fontWeight: 700, fontSize: 24 }}>✓</div>
                <div style={{ fontFamily: t.sans, fontWeight: now ? 700 : 500, fontSize: 48, letterSpacing: -0.8, color: now ? c.ink : c.muted }}>
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

// Kinetic typing. The text types itself huge across the frame, then settles into a small,
// neutral input where pasted chips pop in. Not any product's UI: a pill, a caret and a send dot.
export const TypeVisual: React.FC<Props & { v: V<"type"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const times = v.times ?? [];
  const at = v.at ? times[0] : shot.start + 0.1;
  const cps = 16;
  const typedEnd = at + v.text.length / cps;
  const settleAt = v.settle ? Math.max(times[1], typedEnd + 0.15) : typedEnd + 0.5;
  const chipT = v.chips.map((_, i) => times[2 + i] ?? settleAt + 0.4 + i * 0.25);
  const typed = Math.max(0, Math.floor((time - at) * cps));
  const shown = v.text.slice(0, typed);
  const s = interpolate(time, [settleAt, settleAt + 0.7], [0, 1], { ...clamp, easing: ease });
  // Big: as large as fits in about three lines across the frame.
  const big = Math.min(210, Math.max(110, (w * 2.6) / Math.max(4, v.text.length) / 0.56));
  const lines = Math.ceil((v.text.length * 0.56 * big) / w);
  const small = 50;
  const inputH = 160 + (v.chips.length ? 96 : 0);
  const inputTop = h / 2 - inputH / 2 + 60;
  // On settle the big text shrinks toward the input and dissolves as the same words resolve inside it.
  const out = interpolate(s, [0, 0.6], [0, 1], clamp);
  const into = interpolate(s, [0.35, 1], [0, 1], clamp);
  const bigTop = h / 2 - (lines * big * 1.02) / 2 - 40;
  const caret = Math.floor(time * 2.4) % 2 === 0 || (time >= at && time < typedEnd);
  const sent = v.chips.length ? prog(time, chipT[chipT.length - 1] + 0.4, 0.3) : prog(time, settleAt + 0.8, 0.3);
  const typedText = (text: string) =>
    text.split(/(\/\S+)/).map((part, i) =>
      part.startsWith("/") ? (
        <span key={i} style={{ color: c.accentInk }}>{part}</span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {v.label && (
        <div style={{ position: "absolute", left: 0, right: 0, top: inputTop - 90, textAlign: "center", fontFamily: t.sans, fontWeight: 500, fontSize: 28, letterSpacing: 8, paddingLeft: 8, textTransform: "uppercase", color: c.muted, opacity: s }}>
          {v.label}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: inputTop,
          width: w,
          height: inputH,
          borderRadius: 44,
          background: c.card,
          border: `1.5px solid ${c.line}`,
          boxShadow: c.shadow,
          opacity: s,
          scale: String(0.96 + 0.04 * s),
          filter: `blur(${(1 - s) * 10}px)`,
        }}
      >
        <div style={{ position: "absolute", left: 40, top: 30, display: "flex", gap: 14 }}>
          {v.chips.map((ch, i) => {
            const p = prog(time, chipT[i], 0.35);
            return (
              <div key={i} style={{ height: 66, borderRadius: 18, padding: "0 22px", display: "flex", alignItems: "center", gap: 12, background: c.tint, color: c.accentInk, fontFamily: t.mono, fontSize: 26, opacity: p, scale: String(0.7 + 0.3 * p), transformOrigin: "left center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.accentInk} strokeWidth="2.6" strokeLinecap="round">
                  <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
                  <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
                </svg>
                {ch.text}
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", right: 30, bottom: 30, width: 76, height: 76, borderRadius: 38, background: sent > 0.5 ? c.accent : c.faint, display: "flex", alignItems: "center", justifyContent: "center", scale: String(1 + 0.12 * Math.sin(sent * Math.PI)) }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          right: 130,
          top: inputTop + inputH - 112,
          fontFamily: t.sans,
          fontWeight: 600,
          fontSize: small,
          letterSpacing: -1,
          color: c.ink,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          opacity: into,
          filter: `blur(${(1 - into) * 8}px)`,
        }}
      >
        {typedText(v.text)}
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
          {typedText(shown)}
          <span style={{ display: "inline-block", width: big * 0.07, height: big * 0.86, marginLeft: big * 0.04, translate: `0 ${big * 0.12}px`, background: c.accent, borderRadius: 4, opacity: caret ? 1 : 0 }} />
        </div>
      )}
    </div>
  );
};

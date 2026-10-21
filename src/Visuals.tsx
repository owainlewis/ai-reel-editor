import React from "react";
import { Video } from "@remotion/media";
import { Img, interpolate, staticFile } from "remotion";
import { frameRect } from "./camera";
import { clamp, ease, t } from "./theme";
import { FunnelVisual, GridVisual, pal, SoftAccented, TypeVisual } from "./soft";
import type { ResolvedShot, ResolvedVisual } from "./schema";

type Props = { slug: string; shot: ResolvedShot; time: number; w: number; h: number; filter?: string; bleed?: boolean };
type V<K extends ResolvedVisual["kind"]> = Extract<ResolvedVisual, { kind: K }> & { times?: number[]; size?: [number, number] };

const src = (slug: string, p: string) => (/^https?:/.test(p) ? p : staticFile(`${slug}/${p}`));
// 0 to 1 over `dur` seconds from `at`, eased.
const prog = (time: number, at: number, dur = 0.45) => interpolate(time, [at, at + dur], [0, 1], { ...clamp, easing: ease });

// Text with *one accent* set in Signifier italic.
export const Accented: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*[^*]+\*)/).map((part, i) =>
      part.startsWith("*") ? (
        <span key={i} style={{ fontFamily: t.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: -0.5 }}>
          {part.slice(1, -1)}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

// A real capture, framed as a card or a browser window, with a camera that moves
// from one region to another and a marker that sweeps across what is being said.
const ImageVisual: React.FC<Props & { v: V<"image"> }> = ({ slug, shot, time, w, h, v }) => {
  const [iw, ih] = v.size ?? [1600, 1000];
  const chrome = v.frame === "browser" ? 64 : 0;
  const pad = v.frame === "none" ? 0 : 0;
  const vw = w - pad * 2;
  const vh = h - chrome - pad * 2;
  // Default camera: the top of the image at full width, easing slightly closer.
  const topRect: [number, number, number, number] = [0, 0, 1, Math.min(1, (vh / vw) * (iw / ih))];
  const from = v.from ?? topRect;
  const to = v.to ?? [from[0] + from[2] * 0.03, from[1] + from[3] * 0.03, from[2] * 0.94, from[3] * 0.94];
  const p = interpolate(time, [shot.start, shot.end], [0, 1], { ...clamp, easing: (x) => 1 - Math.pow(1 - x, 2.2) });
  const rect = from.map((a, i) => a + (to[i] - a) * p) as [number, number, number, number];
  // The rect must stay visible; the camera fills the rest of the panel with the page around it.
  const { k, left, top } = frameRect(rect, iw, ih, vw, vh);
  const enter = prog(time, shot.start, 0.35);

  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: v.frame === "none" ? 0 : 26,
        overflow: "hidden",
        background: t.card,
        boxShadow: v.frame === "none" ? "none" : t.shadow,
        border: v.frame === "none" ? "none" : `1px solid ${t.line}`,
        translate: `0 ${(1 - enter) * 30}px`,
      }}
    >
      {v.frame === "browser" && (
        <div style={{ height: chrome, display: "flex", alignItems: "center", gap: 12, padding: "0 26px", borderBottom: `1px solid ${t.line}`, background: "#FAFAF8" }}>
          {["#E5E3DE", "#E5E3DE", "#E5E3DE"].map((c, i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
          ))}
          {v.url && (
            <div style={{ marginLeft: 18, flex: 1, height: 38, borderRadius: 19, background: "#EFEDE8", display: "flex", alignItems: "center", padding: "0 20px", fontFamily: t.sans, fontSize: 22, color: t.muted, whiteSpace: "nowrap", overflow: "hidden" }}>
              {v.url}
            </div>
          )}
        </div>
      )}
      <div style={{ position: "relative", width: vw, height: vh, overflow: "hidden" }}>
        <div style={{ position: "absolute", left, top, width: iw * k, height: ih * k }}>
          <Img src={src(slug, v.src)} style={{ width: "100%", height: "100%", display: "block" }} />
          {v.highlight.map((hl, i) => {
            const at = v.times?.[i] ?? shot.start + 0.3;
            const sweep = prog(time, at, 0.35);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${hl.rect[0] * 100}%`,
                  top: `${hl.rect[1] * 100}%`,
                  width: `${hl.rect[2] * 100}%`,
                  height: `${hl.rect[3] * 100}%`,
                  background: t.highlight,
                  borderRadius: 6,
                  scale: `${sweep} 1`,
                  transformOrigin: "left center",
                  mixBlendMode: "multiply",
                }}
              />
            );
          })}
          {/* Callouts: a label above the highlighted region, joined by a short line. */}
          {v.highlight.map((hl, i) => {
            if (!hl.label) return null;
            const at = (v.times?.[i] ?? shot.start + 0.3) + 0.15;
            const p = prog(time, at, 0.35);
            return (
              <div
                key={`c${i}`}
                style={{
                  position: "absolute",
                  left: `${hl.rect[0] * 100}%`,
                  top: `${hl.rect[1] * 100}%`,
                  translate: "0 -100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  opacity: p,
                  scale: String(0.9 + 0.1 * p),
                  transformOrigin: "left bottom",
                }}
              >
                <div style={{ padding: "8px 18px", borderRadius: 12, background: t.ink, color: "#fff", fontFamily: t.sans, fontWeight: 700, fontSize: 30, letterSpacing: -0.5, whiteSpace: "nowrap", boxShadow: t.shadow }}>
                  {hl.label}
                </div>
                <div style={{ width: 2, height: 22, marginLeft: 22, background: t.ink }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// B-roll. In a panel it sits in a rounded card; as a cutaway it fills the frame edge to edge.
// Either way it gets a slow push-in on top of its own motion, and the speaker's colour grade.
const VideoVisual: React.FC<Props & { v: V<"video"> }> = ({ slug, shot, time, w, h, v, filter, bleed }) => {
  const p = interpolate(time, [shot.start, shot.end], [0, 1], clamp);
  return (
    <div style={{ width: w, height: h, overflow: "hidden", borderRadius: bleed ? 0 : 26, boxShadow: bleed ? "none" : t.shadow }}>
      <Video
        src={src(slug, v.src)}
        muted
        trimBefore={Math.round(v.start * 30)}
        objectFit="cover"
        style={{ width: "100%", height: "100%", scale: String(1.02 + 0.05 * p), filter }}
      />
    </div>
  );
};

// Official logos on white tiles. Each one lands on its spoken word.
const LogosVisual: React.FC<Props & { v: V<"logos"> }> = ({ slug, shot, time, w, h, v }) => {
  const n = v.items.length;
  // Tiles grow with the panel so logos never float small in empty space.
  const tile = n === 1 ? Math.min(460, h * 0.55) : n === 2 ? Math.min(400, h * 0.42, (w - 48) / 2) : n === 3 ? Math.min(290, (w - 96) / 3) : 210;
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 46 }}>
      <div style={{ display: "flex", gap: n > 3 ? 30 : 48, flexWrap: "wrap", justifyContent: "center", maxWidth: w }}>
        {v.items.map((it, i) => {
          const at = v.times?.[i] ?? shot.start + i * 0.12;
          const p = prog(time, at, 0.5);
          const settle = interpolate(time, [at, at + 0.5], [1.12, 1], { ...clamp, easing: ease });
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, opacity: p, translate: `0 ${(1 - p) * 40}px` }}>
              <div style={{ width: tile, height: tile, borderRadius: tile * 0.22, background: t.card, boxShadow: t.shadow, border: `1px solid ${t.line}`, display: "flex", alignItems: "center", justifyContent: "center", scale: String(settle) }}>
                <Img src={src(slug, it.src)} style={{ width: tile * 0.58, height: tile * 0.58, objectFit: "contain" }} />
              </div>
              {it.name && <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: Math.max(40, tile * 0.15), letterSpacing: -1, color: t.ink }}>{it.name}</div>}
            </div>
          );
        })}
      </div>
      {v.caption && (
        <div style={{ fontFamily: t.serif, fontStyle: "italic", fontSize: 52, color: t.muted, opacity: prog(time, shot.start + 0.3) }}>{v.caption}</div>
      )}
    </div>
  );
};

// A headline that builds word by word, with a rule drawing under it.
const TitleVisual: React.FC<Props & { v: V<"title"> }> = ({ shot, time, w, h, v }) => {
  const words = v.text.split(/\s+/);
  const size = v.text.length > 34 ? 92 : v.text.length > 20 ? 112 : 132;
  let k = 0;
  const c = pal(shot.tone);
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 }}>
      {v.kicker && (
        <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: 30, letterSpacing: 6, textTransform: "uppercase", color: c.muted, opacity: prog(time, shot.start) }}>{v.kicker}</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.26}px`, maxWidth: w - 40 }}>
        {words.map((word, i) => {
          const accent = word.startsWith("*");
          const p = prog(time, shot.start + 0.06 * k++, 0.4);
          return (
            <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.12 }}>
              <span
                style={{
                  display: "inline-block",
                  translate: `0 ${(1 - p) * size * 0.5}px`,
                  opacity: p,
                  filter: `blur(${(1 - p) * 12}px)`,
                  fontFamily: accent ? t.serif : t.sans,
                  fontStyle: accent ? "italic" : "normal",
                  fontWeight: accent ? 400 : 700,
                  fontSize: accent ? size * 1.08 : size,
                  letterSpacing: accent ? -1 : -size * 0.035,
                  lineHeight: 1,
                  color: accent ? c.accentInk : c.ink,
                }}
              >
                {word.replace(/\*/g, "")}
              </span>
            </span>
          );
        })}
      </div>
      <div style={{ width: 200, height: 3, background: c.ink, scale: `${prog(time, shot.start + 0.25, 0.6)} 1`, transformOrigin: "left" }} />
    </div>
  );
};

// Rows that arrive as each item is spoken; the newest is active, earlier ones step back.
const ListVisual: React.FC<Props & { v: V<"list"> }> = ({ shot, time, w, h, v }) => {
  const n = v.items.length;
  const times = v.times ?? v.items.map((_, i) => shot.start + i * 0.12);
  const current = v.active ?? Math.max(0, times.filter((x) => time >= x).length - 1);
  const rowH = Math.min(n <= 3 ? 210 : 160, (h - (v.title ? 120 : 0)) / n - 22);
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
      {v.title && (
        <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: 64, letterSpacing: -2, color: t.ink, marginBottom: 12, opacity: prog(time, shot.start) }}>
          <Accented text={v.title} />
        </div>
      )}
      {v.items.map((it, i) => {
        const arrived = prog(time, times[i], 0.45);
        // With preview, every item is visible from the start, dimmed and soft, and sharpens as it is reached.
        const p = v.preview ? 1 : arrived;
        const on = i === current && time >= times[i] - 0.05;
        return (
          <div
            key={i}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: 34,
              padding: "0 40px",
              borderRadius: 24,
              background: t.card,
              border: `1.5px solid ${on ? t.ink : t.line}`,
              boxShadow: on ? t.shadow : "none",
              opacity: v.preview ? 0.3 + 0.7 * (on ? 1 : arrived * 0.6) : p * (on ? 1 : 0.55),
              filter: v.preview ? `blur(${(1 - arrived) * 4}px)` : undefined,
              translate: `${(1 - p) * 80}px 0`,
            }}
          >
            <div style={{ fontFamily: t.serif, fontStyle: "italic", fontSize: rowH * 0.5, color: on ? t.accent : t.faint, width: rowH * 0.4 }}>{i + 1}</div>
            <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: Math.min(68, rowH * 0.36), letterSpacing: -1.5, color: t.ink }}>
              <Accented text={it.text} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// A process: nodes join by a line that draws as each step is spoken.
const StepsVisual: React.FC<Props & { v: V<"steps"> }> = ({ shot, time, w, h, v }) => {
  const n = v.items.length;
  const times = v.times ?? v.items.map((_, i) => shot.start + i * 0.3);
  const gap = Math.min(250, (h - (v.title ? 140 : 0)) / n);
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 30 }}>
      {v.title && (
        <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: 84, letterSpacing: -3, color: t.ink, marginBottom: 60, opacity: prog(time, shot.start) }}>
          <Accented text={v.title} />
        </div>
      )}
      <div style={{ position: "relative", height: gap * n }}>
        {v.items.map((it, i) => {
          const p = prog(time, times[i], 0.45);
          const line = i < n - 1 ? interpolate(time, [times[i] + 0.1, times[i + 1] ?? times[i] + 0.6], [0, 1], { ...clamp, easing: ease }) : 0;
          const dot = 72;
          return (
            <React.Fragment key={i}>
              {i < n - 1 && (
                <div style={{ position: "absolute", left: dot / 2 - 1.5, top: i * gap + dot, width: 3, height: gap - dot, background: t.ink, scale: `1 ${line}`, transformOrigin: "top" }} />
              )}
              <div style={{ position: "absolute", top: i * gap, left: 0, display: "flex", alignItems: "center", gap: 36, opacity: 0.25 + 0.75 * p }}>
                <div style={{ width: dot, height: dot, borderRadius: dot, border: `3px solid ${t.ink}`, background: p > 0.5 ? t.ink : t.canvas, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.serif, fontStyle: "italic", fontSize: 38, color: p > 0.5 ? t.canvas : t.ink }}>
                  {i + 1}
                </div>
                <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: 70, letterSpacing: -2, color: t.ink, translate: `${(1 - p) * 40}px 0` }}>
                  <Accented text={it.text} />
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// Old way against new way. When the new way lands, the old one is struck through.
const CompareVisual: React.FC<Props & { v: V<"compare"> }> = ({ shot, time, w, h, v }) => {
  const rightAt = v.times?.[0] ?? shot.start + 0.6;
  const pl = prog(time, shot.start, 0.45);
  const pr = prog(time, rightAt, 0.5);
  const card = (label: string, text: string, p: number, right: boolean) => (
    <div style={{ flex: 1, height: h * 0.8, borderRadius: 28, padding: 44, background: t.card, border: `1.5px solid ${right ? t.ink : t.line}`, boxShadow: right ? t.shadow : "none", display: "flex", flexDirection: "column", justifyContent: "space-between", opacity: p, translate: `0 ${(1 - p) * 50}px` }}>
      <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: 28, letterSpacing: 5, textTransform: "uppercase", color: t.muted }}>{label}</div>
      <div style={{ position: "relative", fontFamily: right ? t.serif : t.sans, fontStyle: right ? "italic" : "normal", fontWeight: right ? 400 : 700, fontSize: right ? 84 : 68, lineHeight: 1.02, letterSpacing: right ? -1 : -1.5, color: right ? t.ink : t.muted }}>
        {text}
        {!right && <div style={{ position: "absolute", left: -6, right: -6, top: "52%", height: 5, background: t.ink, scale: `${pr} 1`, transformOrigin: "left" }} />}
      </div>
    </div>
  );
  return (
    <div style={{ width: w, height: h, display: "flex", alignItems: "center", gap: 28 }}>
      {card(v.left.label, v.left.text, pl, false)}
      {card(v.right.label, v.right.text, pr, true)}
    </div>
  );
};

const StatVisual: React.FC<Props & { v: V<"stat"> }> = ({ shot, time, w, h, v }) => {
  const m = v.value.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const p = prog(time, shot.start, 0.9);
  let shown = v.value;
  if (m) {
    const target = parseFloat(m[2].replace(/,/g, ""));
    const decimals = (m[2].split(".")[1] || "").length;
    shown = m[1] + (target * p).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + m[3];
  }
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ fontFamily: t.serif, fontSize: v.value.length > 6 ? 220 : 300, lineHeight: 0.9, letterSpacing: -8, color: t.ink, fontVariantNumeric: "tabular-nums" }}>{shown}</div>
      <div style={{ width: 160, height: 3, background: t.ink, scale: `${prog(time, shot.start + 0.3, 0.6)} 1`, transformOrigin: "left" }} />
      <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: 52, letterSpacing: -1, color: t.muted, opacity: prog(time, shot.start + 0.2) }}>
        <Accented text={v.label} />
      </div>
    </div>
  );
};

// A terminal that types each line on its spoken word.
const TerminalVisual: React.FC<Props & { v: V<"terminal"> }> = ({ shot, time, w, h, v }) => {
  const times = v.times ?? v.lines.map((_, i) => shot.start + 0.2 + i * 0.6);
  const enter = prog(time, shot.start, 0.35);
  return (
    <div style={{ width: w, minHeight: h * 0.5, borderRadius: 26, background: t.terminal, boxShadow: t.shadow, overflow: "hidden", translate: `0 ${(1 - enter) * 30}px` }}>
      <div style={{ height: 66, display: "flex", alignItems: "center", gap: 12, padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c, opacity: 0.85 }} />
        ))}
        {v.title && <div style={{ marginLeft: 16, fontFamily: t.sans, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>{v.title}</div>}
      </div>
      <div style={{ padding: "44px 48px", display: "flex", flexDirection: "column", gap: 34 }}>
        {v.lines.map((ln, i) => {
          const at = times[i];
          const typed = Math.floor(Math.max(0, (time - at) * 38));
          if (time < at) return null;
          const out = ln.text.startsWith(">");
          const text = out ? ln.text.slice(1).trim() : ln.text;
          const shown = out ? text : text.slice(0, typed);
          const cursor = !out && typed < text.length + 8 && Math.floor(time * 2.5) % 2 === 0;
          return (
            <div key={i} style={{ fontFamily: t.mono, fontSize: 46, lineHeight: 1.28, color: out ? "rgba(255,255,255,0.55)" : "#F4F2EE", whiteSpace: "pre-wrap" }}>
              {!out && <span style={{ color: "#8FA8E8" }}>$ </span>}
              {shown}
              {cursor && <span style={{ background: "#F4F2EE", color: "transparent" }}>_</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// A chat input where a prompt types itself out, like the real app.
const PromptVisual: React.FC<Props & { v: V<"prompt"> }> = ({ shot, time, w, h, v }) => {
  const at = v.times?.[0] ?? shot.start + 0.2;
  const typed = Math.floor(Math.max(0, (time - at) * 32));
  const shown = v.text.slice(0, typed);
  const done = typed >= v.text.length;
  const enter = prog(time, shot.start, 0.35);
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36, translate: `0 ${(1 - enter) * 30}px` }}>
      <div style={{ fontFamily: t.serif, fontSize: 64, color: t.ink, textAlign: "center" }}>{v.app}</div>
      <div style={{ borderRadius: 32, background: t.card, border: `1.5px solid ${t.line}`, boxShadow: t.shadow, padding: "36px 40px 28px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ minHeight: 120, fontFamily: t.sans, fontSize: 46, lineHeight: 1.3, color: t.ink, whiteSpace: "pre-wrap" }}>
          {shown || <span style={{ color: t.faint }}>Reply to {v.app}...</span>}
          {!done && Math.floor(time * 2.5) % 2 === 0 && <span style={{ borderLeft: `3px solid ${t.ink}`, marginLeft: 2 }} />}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: done ? t.accent : t.faint, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.sans, fontWeight: 700, fontSize: 36 }}>↑</div>
        </div>
      </div>
    </div>
  );
};

// The end card: what to comment, what they get, and the resource itself when there is one.
const CtaVisual: React.FC<Props & { v: V<"cta"> }> = ({ slug, shot, time, w, h, v }) => {
  const a = prog(time, shot.start, 0.4);
  const b = prog(time, shot.start + 0.15, 0.5);
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ fontFamily: t.sans, fontWeight: 700, fontSize: v.src ? 96 : 128, letterSpacing: -3, color: t.ink, textAlign: "center", lineHeight: 1.05, opacity: a, translate: `0 ${(1 - a) * 30}px` }}>
        Comment <span style={{ fontFamily: t.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: -1 }}>“{v.keyword}”</span>
      </div>
      <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: v.src ? 46 : 60, color: t.muted, textAlign: "center", opacity: a }}>{v.text}</div>
      {v.src && (
        <div style={{ width: w * 0.86, height: h * 0.5, borderRadius: 26, overflow: "hidden", background: t.card, boxShadow: t.shadow, border: `1px solid ${t.line}`, opacity: b, translate: `0 ${(1 - b) * 40}px` }}>
          <Img src={src(slug, v.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        </div>
      )}
    </div>
  );
};

// A chapter card: the number lands out of a blur over a soft glow, its name tracked out below.
const ChapterVisual: React.FC<Props & { v: V<"chapter"> }> = ({ shot, time, w, h, v }) => {
  const glow = prog(time, shot.start, 0.9);
  const num = prog(time, shot.start + 0.05, 0.55);
  const label = prog(time, shot.start + 0.3, 0.5);
  const c = pal(shot.tone);
  const dark = shot.tone === "dark";
  const d = Math.min(w * 1.05, h * 0.95);
  return (
    <div style={{ position: "relative", width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div
        style={{
          position: "absolute",
          left: (w - d) / 2,
          top: (h - d) / 2,
          width: d,
          height: d,
          borderRadius: d,
          background: dark
            ? `radial-gradient(circle, rgba(84,104,224,0.45) 0%, rgba(84,104,224,0.18) 38%, rgba(84,104,224,0) 70%)`
            : `radial-gradient(circle, #FFFFFF 0%, rgba(255,255,255,0.92) 28%, rgba(45,79,163,0.16) 56%, rgba(45,79,163,0) 72%)`,
          opacity: glow,
          scale: String(0.7 + 0.3 * glow + 0.04 * interpolate(time, [shot.start, shot.end], [0, 1], clamp)),
        }}
      />
      <div
        style={{
          position: "relative",
          fontFamily: t.sans,
          fontWeight: 700,
          fontSize: 340,
          lineHeight: 0.9,
          letterSpacing: -16,
          color: c.ink,
          fontVariantNumeric: "tabular-nums",
          opacity: num,
          filter: `blur(${(1 - num) * 18}px)`,
          scale: String(1.12 - 0.12 * num),
        }}
      >
        {v.number}
      </div>
      <div style={{ position: "relative", fontFamily: t.sans, fontWeight: 500, fontSize: 36, letterSpacing: 16, paddingLeft: 16, textTransform: "uppercase", color: c.muted, opacity: label, translate: `0 ${(1 - label) * 16}px` }}>
        {v.label}
      </div>
    </div>
  );
};

type Pt = { x: number; y: number };
// A point on a cubic curve, so a dot and a chip can ride along an edge as it draws.
const bezier = (a: Pt, b: Pt, c: Pt, d: Pt, u: number): Pt => {
  const m = 1 - u;
  return {
    x: m * m * m * a.x + 3 * m * m * u * b.x + 3 * m * u * u * c.x + u * u * u * d.x,
    y: m * m * m * a.y + 3 * m * m * u * b.y + 3 * m * u * u * c.y + u * u * u * d.y,
  };
};

// How parts talk: cards land on their words, then the lines between them draw, a dot leading
// each line and a chip (what is passed) riding along it. The card a line reaches takes the accent.
const FlowVisual: React.FC<Props & { v: V<"flow"> }> = ({ shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const n = v.nodes.length;
  const times = v.times ?? [...v.nodes.map((_, i) => shot.start + i * 0.15), ...v.edges.map((_, i) => shot.start + 0.5 + i * 0.5)];
  const row = v.root ? v.nodes.slice(1) : v.nodes;
  const gap = 44;
  // On a full-frame scene, two or three nodes stack top to bottom, large, to use the tall frame.
  const stack = shot.layout === "scene" && !v.root && n <= 3;
  const cw = stack ? Math.min(780, w) : Math.min(v.root ? 440 : 520, (w - gap * (row.length - 1)) / row.length);
  const title = stack ? 64 : Math.max(38, Math.min(52, cw * 0.1));
  const line = stack ? 38 : Math.max(28, Math.min(34, cw * 0.07));
  const vgap = 190;
  const cardH = (nodes: typeof v.nodes) => 92 + title * 1.3 + Math.max(0, ...nodes.map((nd) => nd.lines.length)) * line * 1.9 + 36;
  const dip = 190;
  const rootW = Math.min(560, w * 0.6);
  const rootH = v.root ? cardH(v.nodes.slice(0, 1)) : 0;
  const rowH = cardH(row);
  const total = v.root ? rootH + 210 + rowH : rowH + dip;
  const top0 = Math.max(0, (h - total) / 2);
  const rowTop = v.root ? top0 + rootH + 210 : top0;
  const rowLeft = (w - (cw * row.length + gap * (row.length - 1))) / 2;
  const stackTop = Math.max(0, (h - (rowH * n + vgap * (n - 1))) / 2);
  const boxes = v.nodes.map((_, i) => {
    if (stack) return { x: (w - cw) / 2, y: stackTop + i * (rowH + vgap), w: cw, h: rowH };
    if (v.root && i === 0) return { x: (w - rootW) / 2, y: top0, w: rootW, h: rootH };
    const k = v.root ? i - 1 : i;
    return { x: rowLeft + k * (cw + gap), y: rowTop, w: cw, h: rowH };
  });
  const curve = (from: number, to: number): [Pt, Pt, Pt, Pt] => {
    const a = boxes[from];
    const b = boxes[to];
    if (v.root || stack) {
      const down = a.y < b.y;
      const p0 = { x: a.x + a.w / 2, y: down ? a.y + a.h : a.y };
      const p3 = { x: b.x + b.w / 2, y: down ? b.y : b.y + b.h };
      const s = down ? 1 : -1;
      return [p0, { x: p0.x, y: p0.y + s * 110 }, { x: p3.x, y: p3.y - s * 110 }, p3];
    }
    const p0 = { x: a.x + a.w / 2, y: a.y + a.h };
    const p3 = { x: b.x + b.w / 2, y: b.y + b.h };
    return [p0, { x: p0.x, y: p0.y + dip }, { x: p3.x, y: p3.y + dip }, p3];
  };
  const edges = v.edges.map((e, j) => {
    const at = times[n + j];
    const draw = prog(time, at, 0.7);
    return { e, at, draw, pts: curve(e.from, e.to) };
  });

  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {edges.map(({ draw, pts: [a, b, q, d] }, j) =>
          draw <= 0 ? null : (
            <path
              key={j}
              d={`M${a.x} ${a.y} C${b.x} ${b.y} ${q.x} ${q.y} ${d.x} ${d.y}`}
              pathLength={1}
              fill="none"
              stroke={c.accent}
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray="1 1"
              strokeDashoffset={1 - draw}
            />
          ),
        )}
      </svg>
      {v.nodes.map((nd, i) => {
        const b = boxes[i];
        const p = prog(time, times[i], 0.5);
        // A card takes the accent once a line reaches it.
        const reached = Math.max(0, ...edges.filter((x) => x.e.to === i).map((x) => prog(time, x.at + 0.6, 0.3)));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              borderRadius: 28,
              background: c.card,
              border: `${1.5 + reached * 1.5}px solid ${reached > 0.5 ? c.accent : c.line}`,
              boxShadow: c.shadow,
              padding: "22px 30px",
              boxSizing: "border-box",
              opacity: p,
              filter: `blur(${(1 - p) * 8}px)`,
              translate: `0 ${(1 - p) * 40}px`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, height: 30 }}>
              {[0, 1, 2].map((k) => (
                <div key={k} style={{ width: 11, height: 11, borderRadius: 6, background: c.faint }} />
              ))}
              {nd.kicker && <div style={{ marginLeft: 12, fontFamily: t.sans, fontWeight: 500, fontSize: 22, letterSpacing: 3, textTransform: "uppercase", color: c.muted }}>{nd.kicker}</div>}
            </div>
            <div style={{ marginTop: 22, fontFamily: t.sans, fontWeight: 700, fontSize: title, letterSpacing: -title * 0.03, lineHeight: 1.2, color: c.ink }}>
              <SoftAccented text={nd.title} c={c} />
            </div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: line * 0.7 }}>
              {nd.lines.map((ln, k) => {
                const q = prog(time, times[i] + 0.25 + k * 0.22, 0.4);
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 16, opacity: q, translate: `${(1 - q) * 24}px 0` }}>
                    <div style={{ flex: "none", width: line * 0.9, height: line * 0.9, borderRadius: line, background: c.tint, color: c.accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: t.sans, fontWeight: 700, fontSize: line * 0.55 }}>✓</div>
                    <div style={{ fontFamily: t.sans, fontWeight: 500, fontSize: line, letterSpacing: -0.3, lineHeight: 1.2, color: c.ink }}>{ln}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {edges.map(({ e, at, draw, pts }, j) => {
        if (draw <= 0) return null;
        // The dot leads the line as it draws, then rests where it landed.
        const head = bezier(...pts, draw);
        const ride = e.chip ? prog(time, at + 0.6, 1.2) : 0;
        const chip = bezier(...pts, 0.2 + 0.6 * ride);
        return (
          <React.Fragment key={`e${j}`}>
            {/* Once drawn, small dots keep travelling down the line: work moving between the parts. */}
            {draw >= 1 &&
              [0, 0.5].map((off) => {
                const u = (((time - at - 0.7) / 1.4 + off) % 1 + 1) % 1;
                const q = bezier(...pts, u);
                return <div key={off} style={{ position: "absolute", left: q.x - 6, top: q.y - 6, width: 12, height: 12, borderRadius: 6, background: c.accent, opacity: 0.8 * Math.sin(u * Math.PI) }} />;
              })}
            <div style={{ position: "absolute", left: head.x - 13, top: head.y - 13, width: 26, height: 26, borderRadius: 13, background: c.accent, border: `5px solid ${c.card}`, boxShadow: `0 2px 14px ${c.glow}` }} />
            {e.chip && (
              <div
                style={{
                  position: "absolute",
                  left: chip.x,
                  top: chip.y,
                  translate: "-50% -50%",
                  padding: "12px 24px",
                  borderRadius: 16,
                  background: c.card,
                  border: `1px solid ${c.line}`,
                  boxShadow: c.shadow,
                  fontFamily: t.mono,
                  fontSize: 30,
                  color: c.ink,
                  whiteSpace: "nowrap",
                  opacity: prog(time, at + 0.5, 0.3),
                }}
              >
                {e.chip}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const VisualView: React.FC<Props & { v: ResolvedVisual }> = (p) => {
  const v = p.v;
  switch (v.kind) {
    case "image": return <ImageVisual {...p} v={v} />;
    case "video": return <VideoVisual {...p} v={v} />;
    case "logos": return <LogosVisual {...p} v={v} />;
    case "title": return <TitleVisual {...p} v={v} />;
    case "list": return <ListVisual {...p} v={v} />;
    case "steps": return <StepsVisual {...p} v={v} />;
    case "compare": return <CompareVisual {...p} v={v} />;
    case "stat": return <StatVisual {...p} v={v} />;
    case "terminal": return <TerminalVisual {...p} v={v} />;
    case "prompt": return <PromptVisual {...p} v={v} />;
    case "cta": return <CtaVisual {...p} v={v} />;
    case "chapter": return <ChapterVisual {...p} v={v} />;
    case "flow": return <FlowVisual {...p} v={v} />;
    case "grid": return <GridVisual {...p} v={v} />;
    case "funnel": return <FunnelVisual {...p} v={v} />;
    case "type": return <TypeVisual {...p} v={v} />;
  }
};

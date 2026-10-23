import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { frameRect } from "./camera";
import { pal, type Tone } from "./soft";
import { style } from "./style";
import { clamp, ease } from "./theme";
import type { ResolvedShot, ResolvedVisual } from "./schema";

// A browser window around a real capture: three quiet dots, the page's tab (its real title and
// favicon, when the plan gives them) and the URL with the site in ink and the path muted. Our own
// frame, drawn from tokens; the page inside is always the real capture.

const src = (slug: string, p: string) => (/^(https?|data):/.test(p) ? p : staticFile(`${slug}/${p}`));

// The bar's height for a window this wide: about 7% of the width, 66 to 80 px, so the address
// is never under the 24 px label floor.
export const chromeHeight = (w: number) => Math.round(Math.min(80, Math.max(66, w * 0.07)));
const chromeFont = (h: number) => Math.round(h * 0.36);
const TAB = 0.32;
// Room for the address text in a bar this wide: the bar less its padding, the dots, the tab (when
// there is one), the gaps, the field's own padding and the lock.
export const addressRoom = (w: number, tab: boolean) => {
  const h = chromeHeight(w);
  const dot = Math.round(h * 0.2);
  const dots = dot * 3 + Math.round(dot * 0.55) * 2 + Math.round(h * 0.12);
  const gap = Math.round(h * 0.18);
  return w - Math.round(h * 0.36) * 2 - dots - (tab ? w * TAB + gap : 0) - gap - Math.round(h * 0.28) * 2 - chromeFont(h) * 0.8 - Math.round(h * 0.12);
};

// "https://www.github.com/owner/repo#readme" -> { site: "github.com", path: "/owner/repo" }.
export const splitUrl = (url: string) => {
  const bare = url.replace(/^[a-z]+:\/\//i, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/$/, "");
  const i = bare.indexOf("/");
  return i < 0 ? { site: bare, path: "" } : { site: bare.slice(0, i), path: bare.slice(i) };
};

export const BrowserChrome: React.FC<{ slug: string; w: number; tone?: Tone; url?: string; title?: string; icon?: string }> = ({ slug, w, tone = "light", url, title, icon }) => {
  const c = pal(tone);
  const k = style.color.window[tone];
  const h = chromeHeight(w);
  const field = Math.round(h * 0.6);
  const font = chromeFont(h);
  const dot = Math.round(h * 0.2);
  const { site, path } = splitUrl(url ?? "");
  return (
    <div style={{ height: h, display: "flex", alignItems: "center", gap: Math.round(h * 0.18), padding: `0 ${Math.round(h * 0.36)}px`, background: k.bar, borderBottom: `1px solid ${c.line}`, boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: Math.round(dot * 0.55), flex: "none", marginRight: Math.round(h * 0.12) }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: dot, height: dot, borderRadius: dot, background: k.dot }} />
        ))}
      </div>
      {title && (
        <div style={{ flex: "0 1 auto", maxWidth: `${TAB * 100}%`, height: field, borderRadius: Math.round(field * 0.3), background: k.tab, display: "flex", alignItems: "center", gap: Math.round(h * 0.14), padding: `0 ${Math.round(h * 0.24)}px`, boxShadow: tone === "dark" ? "none" : "0 1px 2px rgba(14,16,19,0.06)", minWidth: 0 }}>
          {icon && <Img src={src(slug, icon)} style={{ width: font, height: font, objectFit: "contain", flex: "none" }} />}
          <div style={{ fontFamily: style.font.sans, fontWeight: 500, fontSize: font, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        </div>
      )}
      {url && (
        <div style={{ flex: 1, minWidth: 0, height: field, borderRadius: field / 2, background: k.field, display: "flex", alignItems: "center", gap: Math.round(h * 0.12), padding: `0 ${Math.round(h * 0.28)}px`, fontFamily: style.font.sans, fontSize: font, whiteSpace: "nowrap", overflow: "hidden" }}>
          <svg width={font * 0.8} height={font * 0.8} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2.4} strokeLinecap="round" style={{ flex: "none" }}>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <span style={{ fontWeight: 500, color: c.ink }}>{site}</span>
          <span style={{ color: c.muted, overflow: "hidden", textOverflow: "ellipsis", marginLeft: -Math.round(h * 0.12) }}>{path}</span>
        </div>
      )}
    </div>
  );
};

// ---------- Stacked windows ----------

type WinProps = { slug: string; shot: ResolvedShot; time: number; w: number; h: number };
type WV = Extract<ResolvedVisual, { kind: "windows" }> & { times?: number[] };
type WinItem = WV["items"][number] & { size?: [number, number] };

// Each window is most of the panel; the stack steps down and right so every title bar shows.
export const windowsGeom = (n: number, w: number, h: number) => {
  const ww = Math.round(w * (n === 2 ? 0.88 : 0.82));
  const wh = Math.round(h * (n === 2 ? 0.84 : 0.78));
  const dx = n > 1 ? (w - ww) / (n - 1) : 0;
  const dy = n > 1 ? (h - wh) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => ({ x: i * dx, y: i * dy, w: ww, h: wh }));
};

const Page: React.FC<{ slug: string; it: WinItem; w: number; h: number }> = ({ slug, it, w, h }) => {
  const [iw, ih] = it.size ?? [1600, 1000];
  const rect = it.from ?? [0, 0, 1, Math.min(1, (h / w) * (iw / ih))];
  const { k, left, top } = frameRect(rect as [number, number, number, number], iw, ih, w, h);
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden", background: style.color.light.card }}>
      <Img src={src(slug, it.src)} style={{ position: "absolute", left, top, width: iw * k, height: ih * k }} />
    </div>
  );
};

export const WindowsVisual: React.FC<WinProps & { v: WV }> = ({ slug, shot, time, w, h, v }) => {
  const c = pal(shot.tone);
  const items = v.items as WinItem[];
  const boxes = windowsGeom(items.length, w, h);
  const times = items.map((_, i) => v.times?.[i] ?? shot.start + 0.2 + i * 0.5);
  const front = v.active ?? Math.max(0, times.filter((x) => time >= x - 0.05).length - 1);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      {items.map((it, i) => {
        const b = boxes[i];
        const p = interpolate(time, [times[i], times[i] + style.motion.enter * 1.3], [0, 1], { ...clamp, easing: ease });
        // Windows behind the one being talked about step back a little.
        const back = i < front ? 1 : 0;
        const chrome = chromeHeight(b.w);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
              borderRadius: style.space.radiusSmall + 4,
              overflow: "hidden",
              border: `1px solid ${c.line}`,
              boxShadow: c.shadow,
              background: style.color.window[shot.tone ?? "light"].bar,
              opacity: p * (1 - 0.35 * back),
              filter: `blur(${(1 - p) * style.motion.blur}px)`,
              translate: `0 ${(1 - p) * 60}px`,
              scale: String(1 - 0.02 * back),
              transformOrigin: "top left",
            }}
          >
            {/* Stacked windows show the address, not a tab: which site each page is from is the point. */}
            <BrowserChrome slug={slug} w={b.w} tone={shot.tone} url={it.url} />
            <Page slug={slug} it={it} w={b.w} h={b.h - chrome} />
          </div>
        );
      })}
    </div>
  );
};

// The layout of a browser card, for tests: the window inside its panel, and the site name, which
// must show whole (a long path or tab title is cut with an ellipsis, as a browser does).
export const browserGeom = (v: ResolvedVisual, w: number, h: number) => {
  const wins = v.kind === "windows" ? windowsGeom(v.items.length, w, h) : [{ x: 0, y: 0, w, h }];
  const urls = v.kind === "windows" ? v.items.map((it) => it.url ?? "") : v.kind === "image" ? [v.url ?? ""] : [];
  return {
    cards: [],
    parts: wins,
    texts: urls.filter(Boolean).map((u, i) => {
      const ch = chromeHeight(wins[i].w);
      const tab = v.kind === "image" && !!v.title;
      return { text: splitUrl(u).site, size: chromeFont(ch), room: addressRoom(wins[i].w, tab), lines: 1, font: "sans" as const, tracking: 0, floor: style.font.labelMin };
    }),
  };
};

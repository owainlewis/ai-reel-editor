// The active style. Components read colour, type, spacing and motion from here. Every style in
// styles/ has the same token shape (StyleTokens in styles/catalog.ts). A plan picks its style
// (`"style"` in edit.json); `reel render` and `stills` pass it as REMOTION_STYLE, and the review
// board passes it in the page's ?style= query. Blueprint when nothing is set.
import { tokens as blueprint } from "../styles/blueprint/tokens";
import { tokens as ivory } from "../styles/ivory/tokens";
import type { StyleTokens, ToneTokens } from "../styles/catalog";

const all: Record<string, StyleTokens> = { blueprint, ivory };
const fromEnv = typeof process !== "undefined" ? process.env?.REMOTION_STYLE : undefined;
const fromPage = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("style") ?? undefined : undefined;
export const STYLE_IDS = Object.keys(all);

export const style: StyleTokens = all[fromEnv ?? fromPage ?? "blueprint"] ?? blueprint;
export const look = { captions: "chunk", chapter: "glow", chart: "framed", ...style.look } as Required<NonNullable<StyleTokens["look"]>>;
export const ACCENT = style.color.light.accent;
export type { ToneTokens };

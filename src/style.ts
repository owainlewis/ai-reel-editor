// The house style: Ivory (Owain, 2026-10-22: "double down on it as the only style"). Components read
// colour, type, spacing and motion from here. Blueprint's folder stays only as the shared card
// catalog that Ivory's cards are built from; it is no longer a look you can render in.
import { tokens as ivory } from "../styles/ivory/tokens";
import type { StyleTokens, ToneTokens } from "../styles/catalog";

export const STYLE_IDS = ["ivory"];
export const style: StyleTokens = ivory;
export const look = { captions: "chunk", chapter: "glow", chart: "framed", ...style.look } as Required<NonNullable<StyleTokens["look"]>>;
export const ACCENT = style.color.light.accent;
export type { ToneTokens };

// The active style. Components read colour, type, spacing and motion from here. Every style in
// styles/ has the same token shape (StyleTokens in styles/catalog.ts); to render with another,
// point this import at its folder.
import { tokens, ACCENT } from "../styles/blueprint/tokens";
import type { StyleTokens, ToneTokens } from "../styles/catalog";

export const style = tokens satisfies StyleTokens;
export { ACCENT, type ToneTokens };

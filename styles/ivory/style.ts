// Ivory's card catalog. It shares Blueprint's cards and slots (the same visual kinds, so a plan can
// switch style without rewriting), restyled by tokens.ts and the `look` switches: keyword captions,
// focus-stack chapters, bare charts. Cards that rely on white boxes read as hairline blocks on paper.
import type { StyleDef } from "../catalog";
import { blueprint } from "../blueprint/style";
import { tokens } from "./tokens";

export const ivory: StyleDef = {
  ...blueprint,
  id: "ivory",
  name: "Ivory",
  number: "02",
  status: "draft",
  summary: "Warm off-white and deep green, heavy Helvetica and Signifier italic. One big thing per beat, no card chrome, no grid.",
  inspiration: "Tom Noske's reels (references/reels/noske-*): off-white and deep green, heavy lowercase words over footage, a blurred numeral behind a sharp word. Kallaway's bare curve charts.",
  palette: { light: tokens.color.light, dark: tokens.color.dark, accent: tokens.color.light.accent },
  fonts: { display: "Helvetica Neue, 800", accent: "Signifier italic", mono: "Helvetica Neue (no mono)", notes: "Helvetica and Signifier always (Owain, 2026-10-22). Labels are small tracked Helvetica." },
  motion: "Slower and softer than Blueprint: 0.6 s enters out of a 14 px blur, 0.16 s staggers. Chapters drift slowly in depth.",
  spacing: tokens.space,
  cards: blueprint.cards.map((c) => ({ ...c, id: c.id.replace(/^blueprint\./, "ivory.") })),
};

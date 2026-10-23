# herk-edit-kit: what to learn from it

A close read of nateherkai/herk-edit-kit (Oct 2026), a Claude Code / Codex video kit built on HyperFrames (HTML + GSAP). Summarised in our own words; numbers are theirs.

## Pipeline

Transcribe, then cut silences, then cut mistakes (candidates, a review gate, apply), then story and beats, then cards from a style library, then mix, checks, draft render, final render and a `VERIFY.md`. Each stage writes a retimed transcript and an edit list for the next.

## Editing rules

- **Silences:** cut only pauses of 0.55 s or more. Keep a breath of 0.24 s after a 2 s pause, 0.20 s after a sentence end, otherwise 0.14 s, split 55/45 around the cut. Head pad 0.22 s, tail pad 0.34 s. This removes about 15 to 20% of a raw take. (We adopted most of this on 2026-10-21.)
- **Mistakes:** a stutter is the same word twice within 0.5 s, and the first copy is cut. A retake is a nearby segment (next 8, within 75 s) whose first 18 content words overlap by Jaccard 0.34 or more, or 0.24 or more with the same opening. A false start is under 6 s and restarts within 12 s. The last take wins. Candidates are reviewed before applying, and a full transcript read is still required.
- **Joins:** cut between phrases, never inside one, and only after a word fully decays (transcripts end words 40 to 80 ms early). Never speed up the voice. Repair joins that are far tighter than the speaker's median gap with 4 to 8 frames of room tone (not silence) and a 40 ms equal-power crossfade.
- **Pacing (their top reels):** shots of 1.1 to 1.4 s, at most about 2.8 s, the first cut at 0.6 to 1.0 s, the speaker on screen about 45%, never away more than about 3.5 s, each list item its own shot.
- **Long form:** one card per topic span, no gap longer than 20 to 30 s early or 30 to 45 s later. A card enters 0.2 to 0.6 s before its anchor.
- **Timing:** overlays are anchored to an exact transcript phrase, never to seconds or `index * 0.4` staggers. "If it doesn't get a word, it doesn't get drawn."
- **Audio:** music bed about 11 dB under the voice (9 to 14), ducked. Master -14 LUFS, true peak at or below -1.5 dBTP, measured on the delivered file. Too-loud music is fixed by lowering the bed, not the master. Sound effects follow visible actions, aligned on their audible peak.

## Style library

- One folder per style: `style.json` (manifest), `DESIGN.md`, `tokens.css`, `cards/tier1|tier2`, and a contact sheet.
- Card ids look like `style.tier.purpose.treatment`.
- Tier 1 cards are full-screen takeovers: thesis, stat, section, quote, overview. Tier 2 cards sit beside the speaker: label, list, equation, definition, lower third.
- Text lives in named slots. Cards are deterministic and read all colour and type from tokens.
- A generated registry (406 cards) lets the agent query by style, tier and purpose.

### Kallaway "aurora glass"

- **Look:** deep cool near-black, one blue glow per beat, glass cards, edge-lit connectors, dot grid and grain.
- **Type:** Plus Jakarta Sans, Inter and Space Mono, with no serif.
- **Motion:** blur-to-sharp focus pulls, `back.out(1.4)` springs, 0.10 to 0.18 s staggers, finite pulses.
- **Layouts:** 300 cards across 5 purposes, with 60 treatments each:
  - stats: rings, gauges, waffles, charts, odometers
  - overviews: agenda, bento, KPI row, matrix, Gantt, mind map, layers, pyramid, Venn
  - sections, lower thirds and labels
- **Their own gap:** the accent colour is hardcoded in 210 cards, so token discipline needs a linter.

## Their quality checks

- `validate-plan`:
  - caption words match retained words within 5 ms
  - every word maps to one keep range
  - scenes are contiguous and frame aligned
  - any gap of 2.2 s or more between visual events needs a `holdReason`
- `validate-beat-sync`: each beat lands between 0.2 s after and 1.8 s before its anchor.
- Contrast report: the median of a 4 px ring around each text box, checked against WCAG AA.
- Animation map: offscreen, too fast (under 0.2 s), too slow, overlapping, and dead zones of 1 s or more with nothing moving.
- Footage ledger: the hash of every shot, so no scene is used twice.
- Manual gates:
  - contiguous frame strips across every cut
  - re-transcribe the render and compare at every join
  - check lip sync
  - check the first 2.5 s for anything over the mouth
  - an entertainment review kept separate from technical QA

## What we already do

- Anchors on spoken phrases
- Natural-breath silence cuts with faded joins
- A review board
- Frame strips at cuts
- Re-transcribing the render to check every word
- Loudness on the delivered file
- B-roll used once
- Rules learned from notes

## Candidates to adopt, ranked

1. Mistake and retake candidates (their thresholds) shown on the review board, so cuts are approved with "play what was removed".
2. Plan validation: caption and word coverage, contiguous frame-aligned shots, and `holdReason` for long static gaps. Each check gets a negative-control test.
3. Join quality: cut after the word decays, room tone instead of silence, and a check of the energy envelope at each join.
4. A card registry with typed slots (maxChars in the schema, not in comments) and a contact sheet at maximum text length. (This is the style library work.)
5. A contrast check on sampled frames.
6. A dead-zone and overlap scan on the plan.
7. A token linter: no literal colours or off-scale sizes in components.
8. An opening and open-loop ledger in the plan (benefit, evidence by 3 s, payoff; every loop closed before the CTA).

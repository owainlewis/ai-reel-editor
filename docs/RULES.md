# Rules from notes

Every note on a draft becomes a rule, a check or a code change, so it never needs saying twice.
Newest first. "Where" says what enforces it.

| Date | Note | Rule | Where |
| --- | --- | --- | --- |
| 2026-10-18 | "React split is the best. Make it a format option with its own lint rules, and use it as the default for tool drops." | `format` in edit.json: `react` (default, tool drops) or `mixed`. Each has its own lint rules. | `src/schema.ts`, `lintShots`, tested |
| 2026-10-18 | (self-review) GitHub's sticky README tab bar was baked into a full-element capture, mid-page. | `capture` sets sticky elements to static before the screenshot. | `tools/cli.ts` |
| 2026-10-18 | (self-review) A full-frame card showed over the previous shot for one frame. | Shot boundaries snap to the frame grid so a layout and its visual switch on the same frame. | `tools/resolve.ts`, tested |
| 2026-10-18 | (self-review) True peak measured -0.98 dBTP after AAC encoding. | Master to -1.5 dBTP so the encoded file stays under -1. `check` flags anything hotter. | `audio/mix.py`, `tools/cli.ts` |
| 2026-10-18 | (self-review) A caption flashed for two frames in the old shot's style before a cut. | A caption chunk that starts within 0.15 s before a cut starts on the cut. | `tools/resolve.ts` `chunkWords`, tested |
| 2026-10-18 | (self-review) Whole web pages were unreadable at phone size. | Capture rects fill the panel (cover). `validate` warns when 16 px page text renders under 30 px. Capture paragraphs at 520 px wide. | `src/Visuals.tsx`, `tools/cli.ts` |
| 2026-10-18 | "This was pretty bad" (first prototype: static text cards on dark panels, slow shots, no real visuals). | Every shot moves and shows something real or does something. Shots average under 1.6 s. Real captures and official logos before designed graphics. | `docs/STYLE.md`, `lintShots` |

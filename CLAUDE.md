# AI Reel Editor

To edit a reel, use the `edit-reel` skill (`.claude/skills/edit-reel/SKILL.md`). It is the process; follow it.

- Read `docs/STYLE.md` and `docs/RULES.md` before planning any edit. RULES.md wins over everything else.
- When the user gives a note on a draft, fix it, then record it in `docs/RULES.md` and, where possible, enforce it in code or a check.
- Never invent facts, numbers, UI or quotes. Never redraw a logo. Check claims against the primary source.
- Projects live in `projects/<slug>/` and are git-ignored. Reusable examples go in `examples/`.
- After changing `src/` or `tools/`, run `npm run typecheck` and `npm test`, and look at `reel stills` output before a full render.
- Writing style for docs and messages: plain words, short sentences, no em dashes.

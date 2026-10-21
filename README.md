# AI Reel Editor

Turn a talking head clip into an edited Instagram reel: real screen captures and logos framed on the words you say, motion graphics that land on their cue, word-timed captions, a music bed and sound design, mixed to platform loudness.

Claude Code is the editor. It researches what you talk about, captures the real pages, plans every shot against your transcript, reviews its own stills and renders. A small CLI does the mechanical work. Every note you give on a draft becomes a rule or a check, so the editor gets better with each reel.

## How it works

```
your clip ──> new ──> transcribe ──> research + capture ──> edit.json ──> validate ──> stills ──> render ──> check
                         │                  │                    │              │            │          │
                    word timings     real pages, logos     shots on spoken   timings,   one frame   cut strips,
                    (mlx-whisper)    (Chrome, logged)      phrases (Claude)  house rules per shot   loudness, words
```

- **Footage stays exact.** The speaker plays as one continuous video, so lip sync never drifts. Layouts only change its framing.
- **Everything is anchored to speech.** A shot, a list item, a logo or a highlight starts on a phrase from the transcript, not on a hand-typed time.
- **Real evidence first.** Pages are captured with Chrome and framed tight on the sentence being said. Logos come from official sources. Every asset is logged with its source in `assets/ledger.json`.
- **Checked like an editor would.** `validate` lints the house rules (shot length, readability of captures, layout variety). `check` makes frame strips across every cut, measures loudness and re-transcribes the render.

## Setup

macOS with Apple Silicon, Homebrew `ffmpeg`, Node 22+, [uv](https://docs.astral.sh/uv/) and Google Chrome.

```sh
npm install
npm test
```

Fonts are read from the machine: Helvetica Neue and [Signifier](https://klim.co.nz/retail-fonts/signifier/) (licensed, not included).
Sound effects and music go in `sounds/` and `music/` (git-ignored, see their READMEs). Anything missing is synthesised.

## Use it

Open the repo in Claude Code and ask:

> Edit ~/Desktop/IG1.mp4 into a reel.

The `edit-reel` skill (`.claude/skills/edit-reel/SKILL.md`) runs the whole process and sends you the MP4. Reply with notes in plain words; each one is fixed and written into `docs/RULES.md`.

The CLI on its own:

```sh
npm run reel -- new ig1 ~/Desktop/IG1.mp4
npm run reel -- transcribe ig1
npm run reel -- capture ig1 https://github.com/alibaba/open-code-review --name repo
npm run reel -- fetch ig1 https://example.com/logo.svg --name logo.svg
# write projects/ig1/edit.json (see examples/)
npm run reel -- validate ig1
npm run reel -- stills ig1
npm run reel -- render ig1
npm run reel -- check ig1
```

Your own b-roll goes in `broll/` (git-ignored). Clips can be stitched together; `index` splits them into shots and crops any letterboxing:

```sh
npm run reel -- index
npm run reel -- broll typing
```

Then use `{ "kind": "video", "src": "broll:1-4" }` in a plan.

Preview a project live in Remotion Studio:

```sh
npx remotion studio src/index.ts --props=projects/ig1/build/edit.resolved.json
```

Review a draft shot by shot on the review board. Every shot loops in its own player, with Approve, Change and a note. Notes save to `projects/<slug>/review.json`; tell Claude "left comments, let's amend" and it reads them with `feedback`, changes only those shots, and they come back as waiting:

```sh
npm run reel -- review ig1
npm run reel -- feedback ig1
```

## The edit plan

`edit.json` is the whole edit. The schema is `src/schema.ts`. Two complete plans for the same clip: `examples/opencodereview-react.edit.json` (the tool-drop format) and `examples/opencodereview-mixed.edit.json`.

`format` is `react` (the default, for tool drops: your face stays on screen while the top panel walks through the source) or `mixed` (every layout, b-roll cutaways). `validate` checks the rules for each; see `docs/STYLE.md`.

```json
{
  "title": "OpenCodeReview",
  "format": "react",
  "face": { "x": 0.49, "y": 0.22, "h": 0.36 },
  "accents": ["essential", "OpenCodeReview"],
  "music": false,
  "shots": [
    { "at": "If you're building", "layout": "split",
      "visual": { "kind": "image", "src": "assets/captures/site.png", "frame": "browser",
                  "from": [0.445, 0.118, 0.47, 0.277], "to": [0.455, 0.14, 0.36, 0.2] } },
    { "at": "having a good", "layout": "full" },
    { "at": "is essential", "layout": "punch" }
  ]
}
```

Layouts: `split`, `full`, `punch`, `media`, `cutaway`. Visuals: `image` (with camera move and highlight), `video`, `logos`, `title`, `list`, `steps`, `compare`, `stat`, `terminal`.

## Layout

```
.claude/skills/edit-reel/   the editor's process
docs/STYLE.md               house look, pacing, captions, sound
docs/RULES.md               notes turned into rules, newest first
src/                        Remotion composition (React)
tools/                      the reel CLI and the timing resolver
audio/                      mix, music bed and sound effect synthesis (Python, run with uv)
examples/                   reference edit plans
broll/                      your b-roll library and its index (git-ignored)
projects/<slug>/            one folder per reel: source, assets, plan, renders, checks (git-ignored)
```

## Licence notes

Remotion is free for individuals and companies of up to three people; larger companies need a [company licence](https://www.remotion.dev/license).
Check the licence of every sound, track and capture you publish.

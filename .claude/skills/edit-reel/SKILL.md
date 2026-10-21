---
name: edit-reel
description: Edit a talking head clip into a finished 9:16 Instagram reel with real captures, logos, motion graphics, captions, music and sound. Use when asked to edit, cut, make or improve a reel or short from a video file, or to apply a note to a reel draft.
---

# Edit a reel

You are the editor. The `reel` CLI does the mechanical work; you make every creative call.
Read `docs/STYLE.md` and `docs/RULES.md` before planning. Rules in RULES.md came from real notes and override everything else here.

## 1. Set up

```sh
npm run reel -- new <slug> <video> [--broll a.mp4 b.mp4]
npm run reel -- transcribe <slug>
```

- Read `projects/<slug>/transcript.txt` end to end. Fix misheard names in `transcript.json` (tools, companies, people). Never change what was said.
- Look at `checks/frame.jpg` and measure the face: centre x, centre y and head height (crown to chin) as fractions of the frame. These go in `face`.
- If the footage already has music under it, set `"music": false`.

## 2. Research before you design

Every named tool, company, repo, number or claim gets checked against its source before it goes on screen.

- Find the primary source (the repo, the docs, the company's site). Read it. Note facts that support what the speaker says.
- If the speaker says something the source contradicts, stop and tell the user. Do not "fix" it with a graphic.
- Never invent numbers, results, quotes or UI. A graphic can only show what was said or what the source shows.

## 3. Collect real visuals

Preference order (see STYLE.md): the user's b-roll, the real product or page, official logos, then designed graphics.

```sh
npm run reel -- capture <slug> <url> --name repo --width 1280 --height 1500
npm run reel -- capture <slug> <url> --name readme --width 520 --selector "article.markdown-body"
npm run reel -- fetch <slug> <logo-url> --name github.svg
```

- Capture at 1280 wide for page chrome and headers. For paragraphs, capture at 520 wide so text wraps into a column you can read on a phone.
- Logos come from the brand's own site, repo or media kit. Never redraw or approximate one. A GitHub org avatar is an official logo.
- Look at every capture with the Read tool and note the exact rectangles you will frame and highlight.
- Everything you capture or download is logged in `assets/ledger.json` with its source.

### B-roll library

Owain's own cinematic shots (typing, working, desk details) live in `broll/`. They make a reel feel shot, not generated.

```sh
npm run reel -- index            # splits new files into shots, crops letterboxing, writes broll/index.json
npm run reel -- broll typing     # list clips, best matches first
```

- After `index`, look at `broll/sheet.jpg` (or `broll/.clips/<id>.jpg`) and fill in each new clip's `description` and `tags` in `broll/index.json`. Describe what is visible, not what it means.
- Use a clip with `{ "kind": "video", "src": "broll:<id>" }`. `validate` copies it into the project.
- Put b-roll on human or abstract lines ("if you're building with AI", "it runs locally"). Keep captures and logos on factual claims. B-roll is never evidence.
- A shot can't run longer than its clip; `validate` errors if it does. Each clip once per reel.

## 4. Pick the format, plan the story, then the shots

Set `format` first (see `docs/STYLE.md`):
- **Tool drop** (a new repo, release, feature or post): `react`. Plan it as a walk through the source: every claim gets a capture with a highlight on the words being said. Use b-roll only inside the split panel.
- **How it works** or **my setup**: `mixed`.

Then set `header` to the hook as a short title (it is the on-screen text in frame 1) and plan chapters: a new `header` on the shot where each section starts. Choose `split`: `inset` when captures with text carry the reel, `half` when the delivery does.

Write `projects/<slug>/edit.json` (schema: `src/schema.ts`). First decide, in your head or in a `note`:

- **Hook (0 to 3 s):** what the viewer sees in frame one that makes them stay. Prefer the product working or the real thing named.
- **Proof:** one shot of evidence that the claim is real (the repo, the source line, the number on the page).
- **Mechanism:** how it works, as a diagram or the source's own words highlighted.
- **Payoff:** what the viewer can now do. End on the speaker's face.

Then shots. Each shot starts on a spoken phrase (`at`), in order. Rules of thumb:

- One idea per shot. Average 1.2 to 1.6 s. Nothing over 2.8 s unless a reveal inside it earns the time.
- Every list item, step and logo gets its own `at` so it lands on its word.
- Mix layouts: split for evidence, full for the speaker's conviction, punch for emphasis and the last line, media for the single most important visual, cutaway for b-roll edge to edge.
- A graphic shows the example or relationship. It does not repeat the caption.
- `accents`: four to six words in the whole reel, the ones that carry the meaning.

### Framing captures

For `image` visuals, `from` and `to` are rectangles `[x, y, w, h]` in 0 to 1 image coordinates. The rectangle fills the panel and the camera eases from one to the other.

- End tight. `validate` warns when page text would be too small to read on a phone.
- Use `highlight` with an `at` to sweep a marker over the exact words being spoken. Add a `label` for a callout tag.
- The rect is the region that must stay visible; the camera widens it to the panel's shape with the page around it. You don't need to match the panel's proportions.

## 5. Check before rendering

```sh
npm run reel -- validate <slug>   # resolves timings, prints the shot table, lints the house rules
npm run reel -- stills <slug>     # one frame per shot -> checks/stills.jpg
```

Read `checks/stills.jpg`. For each shot ask: can I read it at phone size? Does it fill the panel? Is anything over the mouth? Does it show something new? Fix and repeat until every shot passes.

## 6. Render and verify

```sh
npm run reel -- render <slug>     # mixes audio, renders projects/<slug>/renders/final.mp4
npm run reel -- check <slug>      # cut strips, opening frames, loudness, word check
```

Read `checks/opening.jpg` (the first 2.5 s) and `checks/cuts.jpg` (frames each side of every cut). Look for one-frame flashes, captions in the wrong style, empty panels. Loudness should be -14 LUFS, true peak at or under -1 dBTP.

Send the user the MP4. Say plainly what you checked and what you could not (you cannot hear the mix; say so).

## 6b. Review board

Owain reviews shot by shot on the board, not by watching renders:

```sh
npm run reel -- review <slug>     # opens http://localhost:4317 with every shot playing in the Player, no render needed
```

Each shot gets Approve or Change and a note; the whole reel gets a notes box. Everything saves to `projects/<slug>/review.json`, keyed by a shot id (from its anchor) and a hash of the shot. Start the board for Owain after `validate` when a draft is ready; it reloads by itself when `build/edit.resolved.json` changes.

When Owain says he left comments ("left comments, let's amend"):

1. `npm run reel -- feedback <slug>` prints the open changes: the whole-reel notes, then each shot to change with its time, what is said in it and the note. Ignore approved and waiting shots.
2. Apply every change in `edit.json`. Change only the shots named, so approved shots keep their review. Changing a shot's anchor changes its neighbour's length too, and both go back to waiting.
3. `npm run reel -- validate <slug>`. The board reloads; every changed shot goes back to "waiting" and its old note moves to history. Whole-reel notes move to history once the reel changes, so apply them in the same pass.
4. A note Owain has given before, or one that would apply to any reel, goes in `docs/RULES.md` (section 7), and into a check or component where it can be.
5. Run `feedback` again to confirm nothing is still open, then tell Owain which shots to re-review, by number.

## 6c. YouTube longform (16:9)

Owain cuts the raw footage by hand. You add graphics and text to his rough cut; never re-cut it.

```sh
npm run reel -- new <slug> rough-cut.mp4      # landscape footage stays 1920x1080
npm run reel -- transcribe <slug>
```

- Set `"canvas": "youtube"` in `edit.json`. Measure `face` on `checks/frame.jpg` for the side window.
- Read the whole transcript first and pick the moments that earn a graphic: a number, a list, a structure, a before and after, a chapter. About one every 20 to 60 s. Everything else is `full`.
- Start with `{ "at": "<first words>", "layout": "full" }`, then add `over` (lower thirds, chapter titles), `side` (a visual with the speaker in a window) and a return to `full` after each graphic.
- Review it on the board (`npm run reel -- review <slug>`), then `render`.

## 7. Turn notes into rules

When the user gives a note on a draft:

1. Fix the edit.
2. Decide where the fix belongs: a rule in `docs/RULES.md`, a check in `tools/`, or a change to a component in `src/`. Prefer a check or code change over a written rule when the problem can be detected or prevented mechanically.
3. Add a row to the log in `docs/RULES.md`: the note, in the user's words, and what changed.

The same note should never be needed twice.

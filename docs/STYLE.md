# House style

The default look and pacing for Owain's reels. A brief from the user wins over anything here.

## Principles (reels and YouTube)

- Minimal. One idea on screen, lots of space, big type. Motion only to reveal, never to decorate.
- Monochrome plus one muted accent. No glow, no neon, no gradients, nothing bouncing.
- Serif for titles, a plain sans for labels. Things not yet said sit blurred and dim, then sharpen.
- Real content or honest diagrams. An illustrative chart says "Illustration".
- What we avoid: AI motion that is over the top. See `references/README.md`.

## YouTube (16:9, `"canvas": "youtube"`)

Owain edits the rough cut by hand. The plan only lays graphics and text over it, sparsely, and never re-cuts the picture.

| Layout | What it is |
| --- | --- |
| `full` | the picture as cut. Most of the video. |
| `over` | the picture with a quiet overlay: a `lower` third (serif title, sans line, no box) or a cinematic `title` (one small serif line in the centre, the picture dims a little). |
| `side` | the visual on warm near-black, the speaker in a small rounded window on the right. One eased move in and out. |
| `media` | the visual alone. Keep it short; the speaker is away. |
| `cutaway` | b-roll edge to edge. |

About one graphic every 20 to 60 seconds. Graphics hold 4 to 12 seconds and build with reveals or `keep`. No word captions unless `"captions": true`. `validate` checks these.

## Look: light editorial

- Warm off-white canvas (`#F2F0EB`) with a faint dot grid. Ink black type. One muted cobalt for highlights.
- Helvetica Neue bold for structure. Signifier italic for one accent word, in the same colour as the text around it.
- White cards with a soft shadow and a thin edge. Real captures sit in a card or a browser frame.
- No neon, no gradients on type, no emoji, no cartoon icons.

## Formats

Set `format` in `edit.json`. `validate` checks the rules for the one you pick.

| Format | Series | Shape | Rules `validate` checks |
| --- | --- | --- | --- |
| `react` (default) | Tool drop | Face stays on screen in a split for 70 to 85% of the reel. The top panel walks through the real source (site, repo, README, post), panning and highlighting each claim as it is said. Punch in on the hook's stake and the last line. | Split at least 60%. No `media` or `cutaway`. Never two face-only shots in a row. At least 2 source captures. Shots up to about 3.8 s, since a scroll with highlights earns the time. |
| `film` | Explainers, soft tech direction | Full-frame `scene` shots that build across beats with `keep`, light and dark alternating, the speaker as punctuation. | Something new on screen at least every 3.6 s (reveals and headline swaps count). Back-to-back scenes alternate `tone`. |
| `mixed` | How it works, my setup | Every layout: b-roll cutaways, full-frame diagrams, punch-ins. Faster cuts. | Shots under about 2.8 s. No layout three times in a row. Speaker never away more than 3.5 s. |

Why react for tool drops: the viewer judges a new tool by its evidence and by the person vouching for it. Keeping both on screen at once does both jobs. It is also the format behind the strongest organic reels in the October 2026 study of @chase.h.ai.

## Soft tech scenes (`film` format, v2)

A calm product-film look, picked by Owain on 2026-10-21. Use `layout: "scene"` with `tone: "light"` or `"dark"`, and alternate them.

- **Ink and paper.** Light scenes are warm paper `#F2F0EB`, dark scenes warm near-black `#141413`, both with fine film grain. No glow, no gradient backgrounds, no light effects. Depth comes from real shadows and layered cards.
- **One flat accent:** deep vermilion `#D4452B`, the print spot colour. It reads on paper and on black, it is warm without copying Claude's clay orange, and it goes on type, lines, dots and chips only.
- **Big headlines.** The scene `header` is 150 px (126 px when it needs two lines), centred, Helvetica Neue Bold with one Signifier italic accent word in vermilion. Keep it under 26 characters. Words arrive out of a blur; on a swap the old line dissolves as the new one lands.
- **Real content in every graphic.** Grids show real thumbnails captured from the source's own site (`reel fetch --dir captures`, logged in the ledger). Cards list the real fields the script names. Chips are plain words unless a capture shows the real URL. Captures in a scene sit in a card cut to the region being discussed. Never fake a product's UI and never fill space with placeholder shapes.
- **Fewer elements.** At most one diagram per scene. Build it across beats with `keep: true`, swapping the headline per beat.
- **One camera move per shot.** One eased move (a capture's `from` to `to`) or a locked camera. The video and the elements move; the camera does not also zoom and pan on other curves.
- **Shared-element transitions.** Use `enter` on two or three cuts per reel: a grid tile grows into the next scene (`tile`), a result card becomes the next card (`card`), the typed input opens into what it made (`input`), or any frame region grows (`rect`). Inside a shot, `type` shrinks the typed prompt into its input.
- Scene visuals: `grid` (real thumbnails, odometer `count`, `groups` that light on their words), `funnel` (plain-word chips flowing into one result card whose rows land on their words, or the card alone), `type` (kinetic typing that settles into an input), `video` with `loop` (a library's own preview clip in a card at its own shape), `image` captures, `flow` (stacked vertically), `title`.

## Frame 1 and the header

- Every reel sets `header`: the hook as a short title. It is on screen, large, from the very first frame, then docks as a small header above the panel on every split and media shot. A muted viewer always knows the topic.
- Start a new chapter with `header` on a shot ("How it *works*", "How to *use* it"). Three or four chapters in a 30 to 60 s reel.
- Headers state the topic in plain words and one Signifier accent. They never claim more than the source shows.

## Split size

`split: "half"` (the default, and Owain's preference) is a clean 50/50: the visual on the top half, the speaker edge to edge on the bottom half, captions low on the speaker's half. `split: "inset"` gives the visual about 60% and puts the speaker in a rounded window; keep it for other speakers' footage or captures dense with text.

## Layouts (1080 x 1920, hard cuts between them)

| Layout | What it is | Use it for |
| --- | --- | --- |
| `split` | 50/50: visual on the top half, speaker on the bottom half, caption on the speaker | evidence, logos, diagrams. The first frame. |
| `full` | speaker fills the frame, slow push-in | conviction lines, setups |
| `punch` | tight on the face | emphasis, the turn, the last line |
| `media` | visual fills the frame, caption in large serif below | the one visual that matters most |
| `cutaway` | b-roll edge to edge, white caption low on the frame | human and abstract lines; makes the reel feel shot |

Targets from studying top creator reels: shots average 1.1 to 1.6 s and none run over about 2.8 s. The speaker is never off screen for more than 3.5 s.

## Visuals, in order of preference

1. The user's own b-roll (`broll/` library) or footage of the real thing. B-roll sets mood; it never stands in for evidence.
2. A real capture of the page, repo or product, framed tight on the part being discussed, with a highlight sweep on the spoken words.
3. Official logos, on white tiles, each landing on its spoken name.
4. Designed graphics: `steps`, `list`, `compare`, `stat`, `terminal`, `prompt`, `title`, `cta`. Each must have an action (items arrive on their words, a line draws, the old way is struck through). No title card that just sits there.

Patterns that work (from studying top creator reels):
- **Agenda callback.** For a numbered reel ("four systems"), show the whole list early with `preview: true`, an open loop. Bring the same list back before each item with `active` on it.
- **Callouts.** Give a highlight a `label` to point at the part of a page being discussed.
- **Typing prompt.** Show a prompt being typed into the real app with `prompt`, not a description of it.
- **End card.** Close on `cta` ("Comment KEYWORD", what they get, and the resource shown) only when a real resource exists.

Never:
- invent a number, result, UI or quote;
- redraw a logo;
- shrink a whole web page to phone size (crop to the phrase);
- let small UI float in empty space (the rect fills the panel);
- reuse the same b-roll clip twice in one reel.

## Captions

- One to three words, broken at punctuation, pauses and cuts. Hard swap, no pop. On screen two frames before the word, never across a cut.
- On canvas: ink Helvetica bold. On the speaker: white with a soft shadow, on the chest below the chin. On `media` shots: large Signifier italic.
- Accent words stand alone in Signifier italic. Four to six per reel.
- Never over the mouth or chin.

## Sound

- Music bed about 20 dB under the voice, ducked under speech. Off when the footage already has music.
- Sound is rare and tactile: soft whooshes on scene changes, mechanical clicks when something lands, a camera focus beep on a highlight, a real key on typing. At most one sound every 2.5 s apart from typing. Most cuts get nothing. Never drops, glitches, swords, static or synthesised tones.
- No music is better than generic music. With no track in `music/`, the reel has none.
- Master at -14 LUFS integrated, true peak at or under -1 dBTP. The last word is never faded.

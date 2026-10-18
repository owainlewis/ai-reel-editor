# House style

The default look and pacing for Owain's reels. A brief from the user wins over anything here.

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
| `mixed` | How it works, my setup | Every layout: b-roll cutaways, full-frame diagrams, punch-ins. Faster cuts. | Shots under about 2.8 s. No layout three times in a row. Speaker never away more than 3.5 s. |

Why react for tool drops: the viewer judges a new tool by its evidence and by the person vouching for it. Keeping both on screen at once does both jobs. It is also the format behind the strongest organic reels in the October 2026 study of @chase.h.ai.

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
- Sound effects follow visible events only: a soft pop when a logo or item lands, a blip on a highlight, keys on typing. Most cuts get nothing.
- Master at -14 LUFS integrated, true peak at or under -1 dBTP. The last word is never faded.

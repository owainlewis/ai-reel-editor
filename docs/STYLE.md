# House style

The default look and pacing for Owain's reels. A brief from the user wins over anything here.

## Look: light editorial

- Warm off-white canvas (`#F2F0EB`) with a faint dot grid. Ink black type. One muted cobalt for highlights.
- Helvetica Neue bold for structure. Signifier italic for one accent word, in the same colour as the text around it.
- White cards with a soft shadow and a thin edge. Real captures sit in a card or a browser frame.
- No neon, no gradients on type, no emoji, no cartoon icons.

## Layouts (1080 x 1920, hard cuts between them)

| Layout | What it is | Use it for |
| --- | --- | --- |
| `split` | visual on top (y 150 to 880), caption on the seam, speaker below | evidence, logos, diagrams. The first frame. |
| `full` | speaker fills the frame, slow push-in | conviction lines, setups |
| `punch` | tight on the face | emphasis, the turn, the last line |
| `media` | visual fills the frame, caption in large serif below | the one visual that matters most |
| `cutaway` | b-roll edge to edge, white caption low on the frame | human and abstract lines; makes the reel feel shot |

Targets from studying top creator reels: shots average 1.1 to 1.6 s and none run over about 2.8 s. The speaker is never off screen for more than 3.5 s.

## Visuals, in order of preference

1. The user's own b-roll (`broll/` library) or footage of the real thing. B-roll sets mood; it never stands in for evidence.
2. A real capture of the page, repo or product, framed tight on the part being discussed, with a highlight sweep on the spoken words.
3. Official logos, on white tiles, each landing on its spoken name.
4. Designed graphics: `steps`, `list`, `compare`, `stat`, `terminal`, `title`. Each must have an action (items arrive on their words, a line draws, the old way is struck through). No title card that just sits there.

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

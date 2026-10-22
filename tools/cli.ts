// reel: the mechanical half of the editor. Claude Code makes the creative calls
// (see .claude/skills/edit-reel/SKILL.md); these commands do the rest.
//
//   npm run reel -- new <slug> <video> [--broll a.mp4 b.mp4]   portrait for reels, landscape for YouTube
//   npm run reel -- script <slug> <script.txt> [--voice Daniel] [--silent]   a reel from a script, no footage
//   npm run reel -- transcribe <slug>
//   npm run reel -- tighten <slug> [--cut 7.2-10.9 ...] [--gap 0.55] [--speed 1.05]   trim pauses to a breath, cut ranges; then transcribe again
//   npm run reel -- capture <slug> <url> --name <name> [--width 1280] [--height 1600] [--full] [--selector css] [--wait ms]
//   npm run reel -- fetch <slug> <url> --name <file> [--dir logos|captures|broll]
//   npm run reel -- validate <slug>
//   npm run reel -- stills <slug>
//   npm run reel -- render <slug> [--draft]
//   npm run reel -- check <slug>
//   npm run reel -- review [slug] [--no-open]   the review board: watch and note each shot
//   npm run reel -- feedback <slug>             the open notes from the review board
//   npm run reel -- styles [--write]            the Blueprint card catalog (--write updates style.json)
//   npm run reel -- styles stills               contact sheets of every card, light and dark, at sample and max length
//   npm run reel -- styles new <id>             start a new style folder from Blueprint
//   npm run reel -- styles feedback             the open notes from the style lab
//   npm run reel -- index                 split broll/ files into shots, update broll/index.json
//   npm run reel -- broll [words...]      list library clips, best matches first
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Edit, type Resolved, type Word } from "../src/schema.ts";
import { frameRect } from "../src/camera.ts";
import { HEADER, MEDIA, splitGeom } from "../src/theme.ts";
import { chunkWords, estimateWords, lintShots, resolveShots, sfxEvents } from "./resolve.ts";
import { indexLibrary, listLibrary, useClip } from "./broll.ts";
import { compositionFor } from "../src/canvas.ts";
import { formatFeedback } from "../review/model.ts";
import { loadReel } from "../review/store.ts";
import { slotIssues } from "../styles/blueprint/style.ts";
import { registry, styleById, styles } from "../styles/index.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FPS = 30;
const project = (slug: string) => join(ROOT, "projects", slug);

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name: string) => args.includes(`--${name}`);
// Positional arguments come before any --flag.
const firstFlag = args.findIndex((a) => a.startsWith("--"));
const positional = firstFlag < 0 ? args : args.slice(0, firstFlag);

const run = (bin: string, argv: string[], opts: { cwd?: string; quiet?: boolean } = {}) => {
  if (!opts.quiet) console.log(`  $ ${bin} ${argv.join(" ")}`.slice(0, 220));
  const r = spawnSync(bin, argv, { cwd: opts.cwd ?? ROOT, stdio: opts.quiet ? "pipe" : "inherit", encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${bin} failed${opts.quiet ? `:\n${(r.stderr || "").slice(-2000)}` : ""}`);
  return r;
};
const ffmpeg = (argv: string[]) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv]);
const probeDuration = (file: string) =>
  parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
const probeSize = (file: string): [number, number] => {
  const [w, h] = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" }).trim().split(",").map(Number);
  return [w, h];
};
const sha = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 16);
const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file: string, data: unknown) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
};

// Every captured or downloaded asset is logged with where it came from.
const ledger = (dir: string, entry: Record<string, unknown>) => {
  const file = join(dir, "assets", "ledger.json");
  const rows: Record<string, unknown>[] = existsSync(file) ? readJson(file) : [];
  writeJson(file, [...rows.filter((r) => r.file !== entry.file), { ...entry, at: new Date().toISOString() }]);
};

// Pixel size of a PNG or JPEG, so the renderer can frame captures exactly.
const imageSize = (file: string): [number, number] | undefined => {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  return undefined;
};

// Names Whisper otherwise mishears ("CodeCode" for Claude Code).
const VOCAB = "Claude Code, Codex, Claude, Anthropic, OpenAI, GitHub, MCP, LLM, AI agents, Cursor, Gemini.";

const VF = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1";

function cmdNew(slug: string, video: string) {
  const dir = project(slug);
  for (const d of ["source", "assets/captures", "assets/logos", "assets/broll", "build", "renders", "checks"]) mkdirSync(join(dir, d), { recursive: true });
  console.log("Normalising footage to 30 fps, keeping its shape");
  // Keep the speaker footage's own shape (portrait 1080x1920 or landscape 1920x1080) so every
  // layout can frame it; the renderer crops per shot around the face.
  const [sw, sh] = probeSize(video);
  // 4K landscape stays 4K: a 9:16 reel uses only a vertical slice of it, about 1215x2160,
  // which is full quality. Scaled to 1080p first, that slice would be upscaled 1.8x and soft.
  const size: [number, number] = sw > sh ? (sw >= 3840 ? [3840, 2160] : [1920, 1080]) : [1080, 1920];
  const vf = `scale=${size[0]}:${size[1]}:force_original_aspect_ratio=increase,crop=${size[0]}:${size[1]},fps=30,setsar=1`;
  ffmpeg(["-i", video, "-vf", vf, "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", "-an", join(dir, "source/talking.mp4")]);
  ffmpeg(["-i", video, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s24le", join(dir, "source/voice.wav")]);
  ffmpeg(["-ss", "1", "-i", join(dir, "source/talking.mp4"), "-frames:v", "1", "-q:v", "3", join(dir, "checks/frame.jpg")]);
  const broll = args.slice(args.indexOf("--broll") + 1).filter((a) => !a.startsWith("--"));
  if (has("broll"))
    for (const b of broll) {
      const out = join(dir, "assets/broll", basename(b, extname(b)) + ".mp4");
      ffmpeg(["-i", b, "-vf", VF, "-an", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", out]);
      ledger(dir, { file: `assets/broll/${basename(out)}`, source: resolve(b), sha: sha(out) });
    }
  writeJson(join(dir, "project.json"), { slug, original: resolve(video), size, duration: probeDuration(join(dir, "source/talking.mp4")) });
  console.log(`Created ${dir}\nNext: npm run reel -- transcribe ${slug}, then look at checks/frame.jpg to set "face" in edit.json`);
}

// Where the placeholder speaker's face sits in its 1080x1920 frame (see src/Speaker.tsx).
const PLACEHOLDER_FACE = { x: 0.5, y: 0.3, h: 0.17 };

const writeTranscript = (dir: string, words: Word[]) => {
  writeJson(join(dir, "transcript.json"), words);
  const lines = words.map((w, i) => `${String(i).padStart(3)}  ${w.start.toFixed(2).padStart(6)}-${w.end.toFixed(2).padEnd(6)} ${w.text}`);
  writeFileSync(join(dir, "transcript.txt"), lines.join("\n") + "\n");
};

// A project from a script alone, for testing graphics and pacing before anything is recorded.
// The voice is macOS `say`, transcribed for real word timings; --silent estimates timings instead.
// The speaker is drawn as a placeholder in every speaker layout.
function cmdScript(slug: string, file: string) {
  const dir = project(slug);
  for (const d of ["source", "assets/captures", "assets/logos", "assets/broll", "build", "renders", "checks"]) mkdirSync(join(dir, d), { recursive: true });
  const script = readFileSync(file, "utf8").replace(/\s+/g, " ").trim();
  writeFileSync(join(dir, "script.txt"), script + "\n");
  const voice = join(dir, "source/voice.wav");
  let duration: number;
  if (has("silent")) {
    const words = estimateWords(script);
    duration = +(words[words.length - 1].end + 0.6).toFixed(3);
    ffmpeg(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", String(duration), "-c:a", "pcm_s24le", voice]);
    writeTranscript(dir, words);
  } else {
    const aiff = join(dir, "build/say.aiff");
    run("say", ["-v", flag("voice") ?? "Daniel", "-r", flag("rate") ?? "185", "-o", aiff, "-f", join(dir, "script.txt")]);
    // A short tail so the last word is never clipped.
    ffmpeg(["-i", aiff, "-af", "apad=pad_dur=0.6", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s24le", voice]);
    duration = probeDuration(voice);
    cmdTranscribe(slug);
  }
  writeJson(join(dir, "project.json"), { slug, original: resolve(file), script: true, size: [1080, 1920], duration });
  console.log(`Created ${dir} (${duration.toFixed(1)}s, no footage)\nNext: write edit.json; "face" is not needed.`);
}

// Where speech ends in a voice track: the start of the silence that runs to the end of the file,
// counting back-to-back silences as one. The full duration when it ends mid-word.
function speechEnd(file: string): number {
  const total = probeDuration(file);
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=noise=-38dB:d=0.3", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  let k = starts.length - 1;
  if (k < 0 || (ends.length === starts.length && ends[k] < total - 0.05)) return total;
  while (k > 0 && starts[k] - ends[k - 1] < 0.05) k--;
  return starts[k];
}

// A rough take has dead air and false starts. Shorten every silence longer than --gap to a
// natural beat, and drop any --cut ranges (seconds in the original take). Cuts land inside
// silence where they can, so joins are clean. The original files are kept beside the new ones,
// so this can be rerun with different cuts.
function cmdTighten(slug: string) {
  const dir = project(slug);
  const video = join(dir, "source/talking.mp4");
  const voice = join(dir, "source/voice.wav");
  const origVideo = join(dir, "source/talking.orig.mp4");
  const origVoice = join(dir, "source/voice.orig.wav");
  if (!existsSync(origVideo)) execFileSync("mv", [video, origVideo]);
  if (!existsSync(origVoice)) execFileSync("mv", [voice, origVoice]);
  // Natural breathing, after herk-edit-kit's cut-silences: only pauses over 0.55 s are trimmed, and
  // each keeps a breath (0.2 s, 0.24 s for long ones) biased toward the end of the phrase. Owain
  // found 0.25 s gaps plus a 1.1x stretch made the audio sound off (2026-10-21).
  const gap = parseFloat(flag("gap") ?? "0.55");
  // Time-stretching speech can sound processed: keep it at 1 unless asked, and never past 1.05.
  const speed = Math.min(1.05, parseFloat(flag("speed") ?? "1"));
  const total = probeDuration(origVoice);
  const log = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", origVoice, "-af", `silencedetect=noise=-38dB:d=${gap}`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  // Ranges to remove: the inside of each silence (keeping a beat each side), plus --cut ranges.
  const remove: [number, number][] = starts.map((a, i) => {
    const b = Math.min(total, ends[i] ?? total);
    if (a < 0.5) return [0, Math.max(0, b - 0.22)];
    const breath = b - a >= 2 ? 0.24 : 0.2;
    return [a + breath * 0.55, b - breath * 0.45];
  });
  args.forEach((a, i) => {
    if (a !== "--cut") return;
    const [x, y] = args[i + 1].split("-").map(Number);
    remove.push([x, y]);
  });
  // The ending breathes: speech ends where the last silence begins, and nothing in the 0.8 s
  // after it is removed, so a cut to the end of the take never clips the last word.
  // Back-to-back silences at the end are one pause; the tail is measured after the speed-up.
  const TAIL = 0.8 * speed;
  let k = starts.length - 1;
  const trailing = k >= 0 && (ends.length < starts.length || ends[ends.length - 1] >= total - 0.05);
  while (trailing && k > 0 && starts[k] - (ends[k - 1] ?? 0) < 0.05) k--;
  const speechEnd = trailing ? starts[k] : total;
  for (const r of remove) {
    if (r[1] >= total - 0.05) r[0] = Math.max(r[0], Math.min(total, speechEnd + TAIL));
    // Silence after the last word is the tail: never shrink it.
    else if (r[0] >= speechEnd) r[1] = r[0];
  }
  const merged = remove.filter(([a, b]) => b - a > 0.05).sort((p, q) => p[0] - q[0]).reduce<[number, number][]>((out, r) => {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else out.push([...r]);
    return out;
  }, []);
  const keep: [number, number][] = [];
  let at = 0;
  for (const [a, b] of merged) {
    if (a > at) keep.push([at, a]);
    at = Math.max(at, b);
  }
  if (at < total) keep.push([at, total]);
  const segs = keep.filter(([a, b]) => b - a >= 0.04);
  // When the recording stops soon after the last word, hold the last frame in silence to make the tail.
  const kept = keep.length ? keep[keep.length - 1][1] : total;
  const hold = Math.max(0, 0.8 - (kept - Math.min(speechEnd, kept)) / speed);
  const padV = hold > 0.02 ? `,tpad=stop_mode=clone:stop_duration=${hold.toFixed(2)}` : "";
  const padA = hold > 0.02 ? `,apad=pad_dur=${hold.toFixed(2)}` : "";
  // Trim and concat each kept range (frame-accurate, A/V in step). Every audio join gets a 10 ms
  // fade so a cut never clicks.
  const vGraph = segs.map(([a, b], i) => `[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS[v${i}];`).join("\n")
    + `\n${segs.map((_, i) => `[v${i}]`).join("")}concat=n=${segs.length}:v=1:a=0,setpts=PTS/${speed},fps=30${padV}[v]`;
  const aGraph = segs.map(([a, b], i) => `[0:a]atrim=start=${a.toFixed(3)}:end=${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, b - a - 0.01).toFixed(3)}:d=0.01[a${i}];`).join("\n")
    + `\n${segs.map((_, i) => `[a${i}]`).join("")}concat=n=${segs.length}:v=0:a=1${speed !== 1 ? `,atempo=${speed}` : ""}${padA}[a]`;
  writeFileSync(join(dir, "build/tighten-video.txt"), vGraph);
  writeFileSync(join(dir, "build/tighten-audio.txt"), aGraph);
  ffmpeg(["-i", origVideo, "-filter_complex_script", join(dir, "build/tighten-video.txt"), "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "15", "-preset", "fast", "-pix_fmt", "yuv420p", video]);
  ffmpeg(["-i", origVoice, "-filter_complex_script", join(dir, "build/tighten-audio.txt"), "-map", "[a]", "-c:a", "pcm_s24le", voice]);
  const removed = merged.reduce((t, [a, b]) => t + b - a, 0);
  writeJson(join(dir, "build/tighten.json"), { gap, speed, keep, removed: +removed.toFixed(2) });
  const meta = readJson<Record<string, unknown>>(join(dir, "project.json"));
  writeJson(join(dir, "project.json"), { ...meta, duration: probeDuration(video) });
  console.log(`Removed ${removed.toFixed(1)}s in ${merged.length} cuts: ${total.toFixed(1)}s -> ${probeDuration(video).toFixed(1)}s. Next: transcribe again.`);
}

function cmdTranscribe(slug: string) {
  const dir = project(slug);
  const tmp = join(dir, "build/whisper");
  mkdirSync(tmp, { recursive: true });
  const vocab = flag("prompt") ?? VOCAB;
  console.log("Transcribing with mlx-whisper (large-v3-turbo)");
  run("uvx", ["--from", "mlx-whisper", "mlx_whisper", join(dir, "source/voice.wav"), "--model", "mlx-community/whisper-large-v3-turbo",
    "--language", "en", "--word-timestamps", "True", "--output-format", "json", "--output-dir", tmp, "--initial-prompt", vocab], { quiet: true });
  const data = readJson<{ segments: { words?: { word: string; start: number; end: number }[] }[] }>(join(tmp, "voice.json"));
  const raw: Word[] = data.segments.flatMap((s) => s.words ?? []).filter((w) => w.word.trim())
    .map((w) => ({ text: w.word.trim(), start: +w.start.toFixed(3), end: +w.end.toFixed(3) }));
  // Whisper invents words in trailing silence (often the last sentence again, at zero length):
  // drop anything that starts after the audio's measured end of speech. And it splits numbers
  // ("2" ",500"): join them back.
  const end = speechEnd(join(dir, "source/voice.wav"));
  // Near the end of speech, a word of almost no length starts an invented run: cut from there.
  const phantom = raw.findIndex((w) => w.start >= end - 0.2 && w.end - w.start < 0.05);
  const words = raw.slice(0, phantom < 0 ? raw.length : phantom).filter((w) => w.start < end + 0.05).reduce<Word[]>((out, w) => {
    const prev = out[out.length - 1];
    if (prev && /^,\d/.test(w.text) && /\d$/.test(prev.text)) prev.text += w.text, (prev.end = w.end);
    else out.push({ ...w });
    return out;
  }, []);
  if (raw.length !== words.length) console.log(`  cleaned ${raw.length - words.length} words (invented after speech ended, or split numbers)`);
  writeTranscript(dir, words);
  console.log(words.map((w) => w.text).join(" "));
  console.log(`\n${words.length} words -> transcript.json, transcript.txt. Check names are spelled right; fix transcript.json by hand if not.`);
}

const chromePath = () => {
  const candidates = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"];
  const found = candidates.find(existsSync);
  if (!found) throw new Error("Chrome not found. Install Google Chrome.");
  return found;
};

async function cmdCapture(slug: string, url: string) {
  const name = flag("name");
  if (!name) throw new Error("--name is required");
  const { default: puppeteer } = await import("puppeteer-core");
  const dir = project(slug);
  const width = parseInt(flag("width") ?? "1280");
  const height = parseInt(flag("height") ?? "1600");
  const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ["--hide-scrollbars"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: has("dark") ? "dark" : "light" }]);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, parseInt(flag("wait") ?? "800")));
    // Sticky and fixed bars repeat across a full-page or element screenshot; pin them in place.
    await page.evaluate(() => {
      document.querySelectorAll("*").forEach((el) => {
        const p = getComputedStyle(el).position;
        if (p === "sticky") (el as HTMLElement).style.position = "static";
      });
    });
    // Remove cookie banners rather than accepting them.
    await page.evaluate(() => {
      document.querySelectorAll('[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i]').forEach((el) => {
        const s = getComputedStyle(el as Element);
        if (s.position === "fixed" || s.position === "sticky") (el as HTMLElement).remove();
      });
    });
    const out = join(dir, "assets/captures", `${name}.png`);
    const selector = flag("selector");
    if (selector) {
      const el = await page.$(selector);
      if (!el) throw new Error(`selector not found: ${selector}`);
      await el.screenshot({ path: out as `${string}.png` });
    } else {
      await page.screenshot({ path: out as `${string}.png`, fullPage: has("full") });
    }
    ledger(dir, { file: `assets/captures/${name}.png`, url, viewport: `${width}x${height}@2x`, selector, sha: sha(out) });
    console.log(`Saved ${out}`);
  } finally {
    await browser.close();
  }
}

async function cmdFetch(slug: string, url: string) {
  const name = flag("name");
  if (!name) throw new Error("--name is required, with extension, e.g. github.svg");
  const dir = project(slug);
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 ai-reel-editor" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  // Logos by default; real thumbnails and clips from a source's own site go in captures or broll.
  const sub = `assets/${flag("dir") ?? "logos"}`;
  mkdirSync(join(dir, sub), { recursive: true });
  const out = join(dir, sub, name);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  ledger(dir, { file: `${sub}/${name}`, url, sha: sha(out) });
  console.log(`Saved ${out}`);
}

// The board plays every shot in a browser at once. A 4K master, or 24-bit WAV audio, will not
// decode there, so it plays light copies: video at most 1920 on its long side, and AAC audio
// from the mix when there is one, otherwise the voice. Rebuilt only when the source is newer.
const stale = (out: string, src: string) => !existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs;
function makePreviews(dir: string, slug: string, size: [number, number]): Resolved["preview"] {
  const preview: NonNullable<Resolved["preview"]> = {};
  const video = join(dir, "source/talking.mp4");
  if (existsSync(video)) {
    const out = join(dir, "build/preview.mp4");
    if (stale(out, video)) {
      const scale = size[0] >= size[1] ? "scale=min(1920\\,iw):-2" : "scale=-2:min(1920\\,ih)";
      ffmpeg(["-i", video, "-vf", scale, "-an", "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-crf", "23", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
    }
    preview.video = `${slug}/build/preview.mp4`;
  }
  const audioSrc = [join(dir, "build/mix.wav"), join(dir, "source/voice.wav")].find(existsSync);
  if (audioSrc) {
    const out = join(dir, "build/preview.m4a");
    if (stale(out, audioSrc)) ffmpeg(["-i", audioSrc, "-c:a", "aac", "-b:a", "192k", out]);
    preview.audio = `${slug}/build/preview.m4a`;
  }
  return preview;
}

function cmdValidate(slug: string, quiet = false): Resolved {
  const dir = project(slug);
  const meta = readJson<{ duration: number; size?: [number, number]; script?: boolean }>(join(dir, "project.json"));
  const words = readJson<Word[]>(join(dir, "transcript.json"));
  const parsed = Edit.safeParse(readJson(join(dir, "edit.json")));
  if (!parsed.success) {
    console.error(parsed.error.issues.map((i) => `  error  ${i.path.join(".")}: ${i.message}`).join("\n"));
    throw new Error("edit.json does not match the schema (src/schema.ts)");
  }
  const plan = parsed.data;
  const youtube = plan.canvas === "youtube";
  // On YouTube the face only frames the small side window, so a centred default will do to start.
  const face = meta.script ? PLACEHOLDER_FACE : (plan.face ?? (youtube ? { x: 0.5, y: 0.38, h: 0.3 } : undefined));
  if (!face) throw new Error('edit.json needs "face": measure it on checks/frame.jpg');
  const { shots, issues } = resolveShots(plan, words, meta.duration, FPS);
  issues.push(...lintShots(shots, meta.duration, plan.format, plan.canvas));
  if (youtube && !plan.face && !meta.script) issues.push({ level: "warn", message: 'no "face" set; the side window frames the centre. Measure it on checks/frame.jpg' });
  if (youtube && meta.size && meta.size[0] < meta.size[1]) issues.push({ level: "error", message: "youtube canvas needs landscape footage" });

  // Library clips ("broll:<id>") are copied into the project so Remotion can serve them.
  for (const s of shots) {
    const v = s.visual;
    if (v?.kind === "video" && v.src.startsWith("broll:")) {
      const rel = useClip(ROOT, dir, v.src.slice(6));
      if (!rel) issues.push({ level: "error", message: `no library clip ${v.src}; run reel index` });
      else s.visual = { ...v, src: rel };
    }
    if (s.layout === "cutaway" && v?.kind !== "video") issues.push({ level: "error", message: `cutaway at "${s.anchor}" needs a video visual` });
  }

  // Assets must exist, and a b-roll clip is used once per reel.
  const seen = new Set<string>();
  for (const s of shots) {
    const v = s.visual;
    const srcs = !v ? [] : v.kind === "image" || v.kind === "video" ? [v.src] : v.kind === "logos" || v.kind === "logowall" ? v.items.map((i) => i.src) : v.kind === "cta" && v.src ? [v.src] : [];
    // The style's cards are sized for their slots' max lengths.
    if (v && !s.keep) for (const m of slotIssues(v)) issues.push({ level: "warn", message: `"${s.anchor}": ${m}` });
    for (const src of srcs) if (!existsSync(join(dir, src))) issues.push({ level: "error", message: `missing asset ${src}` });
    if (v?.kind === "image" && existsSync(join(dir, v.src))) {
      const size = imageSize(join(dir, v.src));
      s.visual = { ...v, size };
      // Readability: captures are taken at 2x, so page text of 16 CSS px is 32 image px.
      // On the 1080 frame it should be at least about 32 px, or it is unreadable on a phone.
      if (size && v.to && !youtube) {
        const vw = 900;
        const top = s.header ? HEADER.top + 120 + 30 : 150;
        const bottom = (s.layout === "split" ? splitGeom(plan.split).panelBottom : MEDIA.panelBottom) - 20;
        const vh = bottom - top - (v.frame === "browser" ? 64 : 0);
        const { k } = frameRect(v.to, size[0], size[1], vw, vh);
        if (k * 32 < 30) issues.push({ level: "warn", message: `"${s.anchor}": ${v.src} ends too wide; 16px page text shows at ${Math.round(k * 32)}px. Tighten "to".` });
      }
    }
    if (v?.kind === "video" && existsSync(join(dir, v.src))) {
      s.visual = { ...v, size: probeSize(join(dir, v.src)) };
      const left = probeDuration(join(dir, v.src)) - v.start;
      if (!v.loop && s.end - s.start > left + 0.04)
        issues.push({ level: "error", message: `"${s.anchor}": shot is ${(s.end - s.start).toFixed(2)}s but ${v.src} has ${left.toFixed(2)}s from start ${v.start}` });
    }
    // A kept shot carries on the same clip; that is one use, not two.
    if (v?.kind === "video" && !s.keep) {
      if (seen.has(v.src)) issues.push({ level: "error", message: `b-roll ${v.src} is used twice` });
      seen.add(v.src);
    }
  }
  // A reel without its music bed reads flat. Say so when the plan asks for music the library cannot give.
  if (plan.music) {
    const lib = existsSync(join(ROOT, "music")) ? join(ROOT, "music") : "";
    const track = plan.music.track ? join(ROOT, "music", plan.music.track) : "";
    const any = lib && readdirSync(lib, { recursive: true }).some((f) => /\.(mp3|wav|m4a|flac|aiff?)$/i.test(String(f)));
    if (track ? !existsSync(track) : !any) issues.push({ level: "warn", message: `no music found${track ? ` at music/${plan.music.track}` : " in music/"}; the reel will have no bed` });
  }
  // A reel that stops on its last syllable feels cut off. Measured on the audio: Whisper's last
  // timestamp often runs into the silence.
  if (existsSync(join(dir, "source/voice.wav"))) {
    const tail = meta.duration - speechEnd(join(dir, "source/voice.wav"));
    if (tail < 0.5) issues.push({ level: "warn", message: `speech ends ${tail.toFixed(2)}s before the end; it will feel cut off. Keep about 0.8s of tail (reel tighten does)` });
  }
  const allText = words.map((w) => w.text.toLowerCase()).join(" ");
  for (const a of plan.accents) if (!allText.includes(a.toLowerCase())) issues.push({ level: "warn", message: `accent word not spoken: "${a}"` });

  const resolved: Resolved = {
    slug,
    title: plan.title,
    duration: meta.duration,
    fps: FPS,
    video: meta.script ? "" : `${slug}/source/talking.mp4`,
    videoSize: meta.size ?? [1080, 1920],
    audio: existsSync(join(dir, "build/mix.wav")) ? `${slug}/build/mix.wav` : null,
    face,
    grade: plan.grade,
    split: plan.split,
    canvas: plan.canvas,
    captions: plan.captions ?? !youtube,
    preview: makePreviews(dir, slug, meta.size ?? [1080, 1920]),
    shots,
    chunks: chunkWords(words, plan.accents, shots.map((s) => s.start).slice(1), FPS),
    sfx: sfxEvents(shots),
  };
  writeJson(join(dir, "build/edit.resolved.json"), resolved);
  writeJson(join(dir, "build/audio.json"), { duration: meta.duration, music: plan.music, voiceGain: plan.voiceGain, sfx: resolved.sfx });

  if (!quiet) {
    console.log(`\n${youtube ? "youtube (16:9)" : `${plan.format} format`}: ${shots.length} shots, ${resolved.chunks.length} caption chunks, ${resolved.sfx.length} sound events\n`);
    for (const s of shots)
      console.log(`  ${s.start.toFixed(2).padStart(6)} ${(s.end - s.start).toFixed(2).padStart(5)}s  ${s.layout.padEnd(6)} ${(s.visual?.kind ?? "").padEnd(9)} ${s.anchor}`);
    const mix = Object.fromEntries(["full", "punch", "split", "media", "cutaway", "scene", "side", "over"].map((l) => [l, 0]));
    for (const s of shots) mix[s.layout] += s.end - s.start;
    const avg = meta.duration / shots.length;
    console.log(`\n  average shot ${avg.toFixed(2)}s; ` + Object.entries(mix).map(([l, t]) => `${l} ${Math.round((100 * t) / meta.duration)}%`).join(", "));
  }
  for (const i of issues) console.log(`  ${i.level === "error" ? "ERROR" : "warn "}  ${i.message}`);
  if (issues.some((i) => i.level === "error")) throw new Error("fix the errors above");
  return resolved;
}

function cmdAudio(slug: string) {
  const dir = project(slug);
  run("uv", ["run", "--quiet", "--with", "numpy", "--with", "scipy", "--with", "soundfile", "python", "-m", "audio.mix", dir]);
}

const remotion = (argv: string[]) => run("npx", ["remotion", ...argv]);

function cmdRender(slug: string) {
  const dir = project(slug);
  cmdValidate(slug, true);
  cmdAudio(slug);
  const resolved = cmdValidate(slug, true);
  const draft = has("draft");
  const out = join(dir, "renders", draft ? "draft.mp4" : "final.mp4");
  remotion(["render", "src/index.ts", compositionFor(resolved.canvas).id, out, `--props=${join(dir, "build/edit.resolved.json")}`, ...(draft ? ["--scale=0.5", "--crf=26"] : [])]);
  console.log(`\nRendered ${out} (${resolved.duration.toFixed(1)}s)`);
}

function cmdStills(slug: string) {
  const dir = project(slug);
  const r = cmdValidate(slug, true);
  const out = join(dir, "checks/stills");
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(out)) if (f.endsWith(".jpg")) execFileSync("rm", [join(out, f)]);
  // One still per shot, a little after the cut so reveals have started.
  r.shots.forEach((s, i) => {
    const t = Math.min(s.end - 0.05, s.start + Math.min(0.9, (s.end - s.start) * 0.7));
    remotion(["still", "src/index.ts", compositionFor(r.canvas).id, join(out, `${String(i + 1).padStart(2, "0")}.jpg`), `--props=${join(dir, "build/edit.resolved.json")}`,
      `--frame=${Math.round(t * FPS)}`, "--scale=0.4", "--log=error"]);
  });
  ffmpeg(["-pattern_type", "glob", "-i", join(out, "*.jpg"), "-vf", `tile=${Math.min(8, r.shots.length)}x${Math.ceil(r.shots.length / 8)}:padding=8:color=white`, join(dir, "checks/stills.jpg")]);
  console.log(`Contact sheet: ${join(dir, "checks/stills.jpg")}`);
}

function cmdCheck(slug: string) {
  const dir = project(slug);
  const file = existsSync(join(dir, "renders/final.mp4")) ? join(dir, "renders/final.mp4") : join(dir, "renders/draft.mp4");
  const r = readJson<Resolved>(join(dir, "build/edit.resolved.json"));
  const checks = join(dir, "checks");
  console.log(`Checking ${file}`);
  // Two frames each side of every cut, in order, to catch one-frame glitches.
  mkdirSync(join(checks, "cuts"), { recursive: true });
  r.shots.slice(1).forEach((s, i) => {
    const t0 = Math.max(0, s.start - 2 / FPS);
    ffmpeg(["-ss", t0.toFixed(3), "-i", file, "-vf", "scale=180:-1,tile=4x1", "-frames:v", "1", join(checks, "cuts", `${String(i + 2).padStart(2, "0")}.jpg`)]);
  });
  ffmpeg(["-pattern_type", "glob", "-i", join(checks, "cuts", "*.jpg"), "-vf", `tile=2x${Math.ceil((r.shots.length - 1) / 2)}:padding=6:color=white`, "-frames:v", "1", join(checks, "cuts.jpg")]);
  // The first 2.5 seconds frame by frame at low size: the hook gate.
  ffmpeg(["-i", file, "-t", "2.5", "-vf", "fps=6,scale=180:-1,tile=8x2", "-frames:v", "1", join(checks, "opening.jpg")]);
  // No frame of a scene may show black outside its canvas: sample the outermost columns of each
  // scene shot at its start, middle and end. Pure black there means the frame is offset or a
  // layer did not land at x = 0. Pure black decodes to 0 to 4; the dark canvas #141413 decodes to 14.
  const edge = (t: number, x: string) =>
    execFileSync("ffmpeg", ["-v", "error", "-ss", t.toFixed(3), "-i", file, "-frames:v", "1", "-vf", `crop=4:ih:${x}:0,scale=1:1,format=gray`, "-f", "rawvideo", "-"])[0];
  const black: string[] = [];
  for (const s of r.shots.filter((s) => s.layout === "scene")) {
    for (const t of [s.start + 1 / FPS, (s.start + s.end) / 2, s.end - 2 / FPS]) {
      const [l, rt] = [edge(t, "0"), edge(t, "iw-4")];
      if (l < 8 || rt < 8) black.push(`${t.toFixed(2)}s (left ${l}, right ${rt})`);
    }
  }
  console.log(black.length ? `  BLACK EDGE on scene frames: ${black.join(", ")}` : `  edges: no black at the frame edges on scene shots`);
  // Loudness of the delivered file.
  const ln = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "loudnorm=print_format=json", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const stats = JSON.parse(ln.slice(ln.lastIndexOf("{"), ln.lastIndexOf("}") + 1));
  console.log(`  loudness ${stats.input_i} LUFS, true peak ${stats.input_tp} dBTP (target -14, <= -1)${stats.input_tp > -1 ? "  TOO HOT" : ""}`);
  // Every word survives: re-transcribe the render and compare.
  const tmp = join(dir, "build/check-whisper");
  mkdirSync(tmp, { recursive: true });
  ffmpeg(["-i", file, "-vn", "-ac", "1", "-ar", "16000", join(tmp, "render.wav")]);
  run("uvx", ["--from", "mlx-whisper", "mlx_whisper", join(tmp, "render.wav"), "--model", "mlx-community/whisper-large-v3-turbo", "--language", "en",
    "--output-format", "txt", "--output-dir", tmp, "--initial-prompt", VOCAB], { quiet: true });
  // Compare without apostrophes or spaces, so "you're" and "OpenCodeReview" match however Whisper splits them.
  const heard = readFileSync(join(tmp, "render.txt"), "utf8").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "");
  const orig = readJson<Word[]>(join(dir, "transcript.json")).map((w) => w.text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "")).filter(Boolean);
  const missing = orig.filter((w) => !heard.includes(w));
  console.log(`  words: ${orig.length} in source, ${missing.length} not heard in render${missing.length ? `: ${missing.slice(0, 12).join(", ")}` : ""}`);
  console.log(`  review: checks/opening.jpg, checks/cuts.jpg, checks/stills.jpg`);
}

// The review board: a local page with every shot playing, Approve / Change and a note on each.
// Notes save to projects/<slug>/review.json; `feedback` prints the open ones.
async function cmdReview(slug?: string) {
  if (slug) cmdValidate(slug, true);
  const { startReview } = await import("../review/server.ts");
  const { url } = await startReview(ROOT, parseInt(flag("port") ?? "4317"));
  const page = slug ? `${url}/#/reel/${slug}` : url;
  console.log(`Review board: ${page}\nCtrl+C to stop.`);
  if (!has("no-open")) spawnSync("open", [page]);
}

function cmdFeedback(slug: string) {
  const r = loadReel(project(slug));
  const moved = [...r.changed.map((id) => `${id} changed`), ...r.added.map((id) => `${id} new`), ...r.removed.map((id) => `${id} removed`)];
  console.log(formatFeedback(slug, r.review, r.shots));
  if (moved.length) console.log(`\nSince the last review: ${moved.join(", ")}. These wait for Owain.`);
}

// The style library: list the catalog, write style.json and registry.json, start a new style from
// Blueprint, render contact sheets, print the lab's notes. `--style <id>` picks a style (default blueprint).
async function cmdStyles(sub?: string) {
  const def = styleById(flag("style") ?? "blueprint");
  if (!def) throw new Error(`no style ${flag("style")}; styles: ${styles.map((s) => s.id).join(", ")}`);
  const dir = join(ROOT, "styles", def.id);
  if (sub === "new") return newStyle(positional[2]);
  if (sub === "stills") {
    const { renderCardSheet } = await import("./stylesheet.ts");
    return renderCardSheet(ROOT, def, join(dir, "checks"), has("max") ? ["max"] : has("sample") ? ["sample"] : ["sample", "max"]);
  }
  if (sub === "feedback") {
    const { loadStyleReview, formatStyleFeedback } = await import("../review/styles.ts");
    return console.log(formatStyleFeedback(loadStyleReview(dir, def).review, def.cards));
  }
  if (has("write")) {
    for (const s of styles) writeJson(join(ROOT, "styles", s.id, "style.json"), s);
    writeJson(join(ROOT, "styles", "registry.json"), registry());
    console.log(`Wrote style.json for ${styles.map((s) => s.id).join(", ")} and styles/registry.json`);
  }
  console.log(`${def.name} (${def.id}): ${def.cards.length} cards\n`);
  for (const c of def.cards) console.log(`  ${c.id.padEnd(30)} ${c.kind.padEnd(12)} ${c.layouts.join(",").padEnd(30)} ${c.added ? "new  " : "     "}${c.summary}`);
  console.log(`\nStyle lab: npm run reel -- review, then the style lab. Slots and limits: styles/${def.id}/style.json`);
}

// A new style folder: Blueprint's tokens and catalog under the new id, and the DESIGN.md skeleton.
function newStyle(id?: string) {
  if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("usage: reel styles new <id> (lowercase, e.g. aurora)");
  const dir = join(ROOT, "styles", id);
  if (existsSync(dir)) throw new Error(`${dir} exists`);
  mkdirSync(dir, { recursive: true });
  const name = id.replace(/(^|-)(\w)/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());
  const from = (f: string) => readFileSync(join(ROOT, "styles", "blueprint", f), "utf8");
  writeFileSync(join(dir, "tokens.ts"), from("tokens.ts").replace('id: "blueprint"', `id: "${id}"`).replace('name: "Blueprint"', `name: "${name}"`));
  writeFileSync(
    join(dir, "style.ts"),
    from("style.ts")
      .replace(/"blueprint\./g, `"${id}.`)
      .replace(/export const blueprint: StyleDef/, `export const ${id.replace(/-(\w)/g, (_, c) => c.toUpperCase())}: StyleDef`)
      .replace('number: "01"', `number: "${String(styles.length + 1).padStart(2, "0")}"`),
  );
  writeFileSync(join(dir, "samples.ts"), from("samples.ts"));
  writeFileSync(join(dir, "DESIGN.md"), readFileSync(join(ROOT, "styles", "_template", "DESIGN.md"), "utf8").replace(/<Name>/g, name));
  console.log(`Made ${dir} from Blueprint. Next: fill DESIGN.md, change tokens.ts, add it to styles/index.ts, then
  npm run reel -- styles --write --style ${id}   and review it in the style lab. See styles/README.md.`);
}

async function main() {
  const [, slug, third] = positional;
  switch (cmd) {
    case "new": return cmdNew(slug, third);
    case "script": return cmdScript(slug, third);
    case "transcribe": return cmdTranscribe(slug);
    case "tighten": return cmdTighten(slug);
    case "capture": return cmdCapture(slug, third);
    case "fetch": return cmdFetch(slug, third);
    case "validate": return void cmdValidate(slug);
    case "audio": cmdValidate(slug, true); return cmdAudio(slug);
    case "stills": return cmdStills(slug);
    case "render": return cmdRender(slug);
    case "check": return cmdCheck(slug);
    case "review": return cmdReview(slug);
    case "feedback": return cmdFeedback(slug);
    case "styles": return cmdStyles(slug);
    case "index": return void indexLibrary(ROOT);
    case "broll": return listLibrary(ROOT, positional.slice(1).join(" "));
    default:
      console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(0, 21).join("\n"));
  }
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});


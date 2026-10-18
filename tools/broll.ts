// The b-roll library: drop clips (or several shots stitched together) into broll/,
// run `reel index`, and each shot becomes its own clip in broll/.clips/ with an
// entry in broll/index.json. Claude fills in each clip's description and tags
// after looking at its contact sheet; edit plans then refer to clips as "broll:<id>".
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

export type Clip = {
  id: string;
  source: string;
  start: number;
  end: number;
  duration: number;
  crop: string;
  brightness: number;
  description: string;
  tags: string[];
};

const VIDEO = new Set([".mp4", ".mov", ".m4v", ".mkv", ".webm"]);

const ff = (args: string[]) => spawnSync("ffmpeg", ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
const ffOk = (args: string[]) => {
  const r = ff(["-loglevel", "error", "-y", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-1500)}`);
};
const probe = (file: string) => {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(out);
  return { w: j.streams[0].width as number, h: j.streams[0].height as number, duration: parseFloat(j.format.duration) };
};

// The picture area inside any letterbox or pillarbox. Small dark edges inside the
// picture are kept, so a dark corner is not mistaken for a bar.
const detectCrop = (file: string, w: number, h: number) => {
  const r = ff(["-i", file, "-t", "6", "-vf", "cropdetect=limit=24:round=2:reset=0", "-an", "-f", "null", "-"]);
  const all = [...r.stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].map((m) => m.slice(1).map(Number));
  if (!all.length) return { cw: w, ch: h, cx: 0, cy: 0 };
  const [cw, ch, cx, cy] = all[all.length - 1];
  return cw > w * 0.85 ? { cw: w, ch, cx: 0, cy } : { cw, ch, cx, cy };
};

// Shot boundaries from frame differences. Low threshold, then drop cuts closer than `minGap`.
const detectCuts = (file: string, duration: number, minGap = 0.8) => {
  const r = ff(["-i", file, "-vf", "scale=320:-2,select='gt(scene,0.03)',showinfo", "-an", "-f", "null", "-"]);
  const times = [...r.stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const cuts: number[] = [];
  for (const t of times) if (t - (cuts[cuts.length - 1] ?? 0) >= minGap && duration - t >= minGap) cuts.push(t);
  return [0, ...cuts, duration];
};

const brightnessOf = (file: string) => {
  const r = ff(["-i", file, "-vf", "fps=2,scale=160:-2,signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-an", "-f", "null", "-"]);
  const v = [...r.stderr.matchAll(/YAVG=([\d.]+)/g)].map((m) => parseFloat(m[1]));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
};

export const indexLibrary = (root: string) => {
  const lib = join(root, "broll");
  const clipsDir = join(lib, ".clips");
  mkdirSync(clipsDir, { recursive: true });
  const indexFile = join(lib, "index.json");
  const index: Clip[] = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : [];
  const known = new Set(index.map((c) => c.source));
  const files = readdirSync(lib).filter((f) => VIDEO.has(extname(f).toLowerCase()));
  for (const f of files) {
    const file = join(lib, f);
    const stamp = `${f}@${statSync(file).mtimeMs | 0}`;
    if (known.has(stamp)) continue;
    const { w, h, duration } = probe(file);
    const { cw, ch, cx, cy } = detectCrop(file, w, h);
    const bounds = detectCuts(file, duration);
    console.log(`  ${f}: ${bounds.length - 1} shots, picture ${cw}x${ch} at ${cx},${cy}`);
    for (let i = 0; i < bounds.length - 1; i++) {
      // Stay a few frames inside each boundary to skip dissolves and flash frames.
      const start = +(bounds[i] + (i ? 0.12 : 0)).toFixed(3);
      const end = +(bounds[i + 1] - 0.12).toFixed(3);
      const id = `${basename(f, extname(f))}-${i + 1}`;
      const out = join(clipsDir, `${id}.mp4`);
      const crop = `crop=${cw}:${ch}:${cx}:${cy}`;
      // Landscape clips keep their shape at 1920 wide; portrait clips keep 1080x1920.
      const scale = cw >= ch ? "scale=1920:-2" : "scale=1080:-2";
      ffOk(["-ss", String(start), "-to", String(end), "-i", file, "-vf", `${crop},${scale},fps=30,setsar=1`, "-an", "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p", out]);
      ffOk(["-i", out, "-vf", `select='eq(n\\,0)+eq(n\\,${Math.floor(((end - start) * 30) / 2)})+eq(n\\,${Math.floor((end - start) * 30) - 2})',scale=360:-2,tile=3x1:padding=4`, "-frames:v", "1", "-fps_mode", "vfr", join(clipsDir, `${id}.jpg`)]);
      index.push({ id, source: stamp, start, end, duration: +(end - start).toFixed(3), crop, brightness: brightnessOf(out), description: "", tags: [] });
    }
  }
  index.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  writeFileSync(indexFile, JSON.stringify(index, null, 2) + "\n");
  // One sheet of every clip, in index order, for choosing at a glance.
  const sheets = index.map((c) => join(clipsDir, `${c.id}.jpg`)).filter(existsSync);
  if (sheets.length) {
    const list = join(clipsDir, "sheets.txt");
    writeFileSync(list, sheets.map((s) => `file '${s}'`).join("\n"));
    ffOk(["-f", "concat", "-safe", "0", "-i", list, "-vf", "tile=1x" + sheets.length + ":padding=6:color=white", "-frames:v", "1", join(lib, "sheet.jpg")]);
  }
  const blank = index.filter((c) => !c.description).map((c) => c.id);
  console.log(`\n${index.length} clips in broll/index.json; contact sheet broll/sheet.jpg`);
  if (blank.length) console.log(`Describe these clips in broll/index.json (look at broll/.clips/<id>.jpg): ${blank.join(", ")}`);
  return index;
};

export const listLibrary = (root: string, query?: string) => {
  const index: Clip[] = JSON.parse(readFileSync(join(root, "broll", "index.json"), "utf8"));
  const words = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const score = (c: Clip) => words.filter((w) => `${c.description} ${c.tags.join(" ")}`.toLowerCase().includes(w)).length;
  const rows = index.map((c) => ({ c, s: score(c) })).filter((r) => !words.length || r.s > 0).sort((a, b) => b.s - a.s);
  for (const { c } of rows) console.log(`  ${c.id.padEnd(8)} ${c.duration.toFixed(1).padStart(4)}s  light ${String(c.brightness).padStart(3)}  ${c.description || "(no description)"}  [${c.tags.join(", ")}]`);
};

// Copy a library clip into a project so Remotion can serve it, and log where it came from.
export const useClip = (root: string, projectDir: string, id: string) => {
  const src = join(root, "broll", ".clips", `${id}.mp4`);
  if (!existsSync(src)) return null;
  const rel = `assets/broll/${id}.mp4`;
  const dest = join(projectDir, rel);
  mkdirSync(join(projectDir, "assets/broll"), { recursive: true });
  if (!existsSync(dest) || statSync(dest).mtimeMs < statSync(src).mtimeMs) copyFileSync(src, dest);
  return rel;
};

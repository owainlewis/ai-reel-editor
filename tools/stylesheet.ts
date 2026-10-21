// Contact sheets of the style catalog: every card's sample, in the split and as a scene, one sheet
// per tone, plus the overlays on 16:9. Each still is taken once every part has landed and is
// labelled with its card id, so a sheet can be checked for clipping, edges and phone readability.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { compositionFor } from "../src/canvas.ts";
import { cards } from "../styles/blueprint/style.ts";
import { labResolved, labViews, LAB_FPS, type LabSize, type LabTone } from "../styles/blueprint/lab.ts";

const FONT = "/System/Library/Fonts/Supplemental/Courier New.ttf";

const ffmpeg = (argv: string[]) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr.slice(-800)}`);
};

export async function renderCardSheet(root: string, out: string) {
  const stills = join(out, "stills");
  rmSync(stills, { recursive: true, force: true });
  mkdirSync(stills, { recursive: true });
  console.log("Bundling…");
  const serveUrl = await bundle({ entryPoint: join(root, "src/index.ts"), publicDir: join(root, "projects") });
  const jobs: { file: string; label: string; size: LabSize; tone: LabTone }[] = [];
  for (const [n, card] of cards.entries()) {
    for (const { size, tone } of labViews(card)) {
      const r = labResolved(card, size, tone);
      if (!r) continue;
      const id = compositionFor(r.canvas).id;
      const composition = await selectComposition({ serveUrl, id, inputProps: r });
      const times = r.shots[0].visual?.times ?? [0];
      const t = Math.min(r.duration - 0.2, Math.max(...times) + 1.6);
      const file = join(stills, `${tone}-${size}-${String(n + 1).padStart(2, "0")}.png`);
      await renderStill({ composition, serveUrl, inputProps: r, frame: Math.round(t * LAB_FPS), output: file, scale: 0.5 });
      // Label each still under the frame with its card id.
      const labelled = file.replace(/\.png$/, ".jpg");
      ffmpeg(["-i", file, "-vf", `pad=iw:ih+44:0:0:white,drawtext=fontfile='${FONT}':text='${card.id} ${size}':x=10:y=h-32:fontsize=22:fontcolor=0x333333`, "-q:v", "3", labelled]);
      rmSync(file);
      jobs.push({ file: labelled, label: card.id, size, tone });
      process.stdout.write(".");
    }
  }
  console.log("");
  const sheet = (name: string, files: string[], cols: number) => {
    if (!files.length) return;
    const list = join(out, `${name}.txt`);
    // ffmpeg's concat demuxer feeds the stills in order to the tile filter.
    const text = files.map((f) => `file '${f}'`).join("\n");
    writeFileSync(list, text + "\n");
    const rows = Math.ceil(files.length / cols);
    ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-vf", `scale=iw/2:-1,tile=${cols}x${rows}:padding=12:margin=12:color=0xD6D9DE`, "-frames:v", "1", "-q:v", "3", join(out, `${name}.jpg`)]);
    rmSync(list);
    console.log(`Contact sheet: ${join(out, `${name}.jpg`)}`);
  };
  for (const tone of ["light", "dark"] as const) {
    // Each card's split then its scene, side by side.
    const files = jobs.filter((j) => j.tone === tone && j.size !== "wide").map((j) => j.file);
    sheet(`cards-${tone}`, files, 8);
  }
  sheet("cards-overlay", jobs.filter((j) => j.size === "wide").map((j) => j.file), 1);
  console.log(`Stills: ${stills} (${readdirSync(stills).length})`);
}

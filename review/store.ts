// Reads and writes review.json next to a project's plan. Used by the board's server and `reel feedback`.
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Resolved } from "../src/schema.ts";
import { counts, emptyReview, mergeReview, reelHash, shotInfo, type Review } from "./model.ts";

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8"));

export const reviewFile = (dir: string) => join(dir, "review.json");

export const saveReview = (dir: string, review: Review) => {
  // Write then rename, so a reader never sees half a file.
  const tmp = reviewFile(dir) + ".tmp";
  writeFileSync(tmp, JSON.stringify(review, null, 2) + "\n");
  renameSync(tmp, reviewFile(dir));
};

// The reel as it is now, with its review brought up to date and saved if anything moved.
export const loadReel = (dir: string) => {
  const file = join(dir, "build", "edit.resolved.json");
  if (!existsSync(file)) throw new Error(`no ${file}; run: npm run reel -- validate <slug>`);
  const resolved = readJson<Resolved>(file);
  const shots = shotInfo(resolved);
  const reel = reelHash(resolved);
  const before = existsSync(reviewFile(dir)) ? readJson<Review>(reviewFile(dir)) : emptyReview();
  const merged = mergeReview(before, shots, reel);
  if (JSON.stringify(merged.review) !== JSON.stringify(before)) saveReview(dir, merged.review);
  return { resolved, shots, reel, review: merged.review, changed: merged.changed, added: merged.added, removed: merged.removed };
};

// One row per project for the library page.
export const listProjects = (root: string) => {
  const projects = join(root, "projects");
  if (!existsSync(projects)) return [];
  return readdirSync(projects, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => {
      const dir = join(projects, d.name);
      const renders = existsSync(join(dir, "renders"))
        ? readdirSync(join(dir, "renders")).filter((f) => f.endsWith(".mp4")).map((f) => ({ file: `${d.name}/renders/${f}`, at: statSync(join(dir, "renders", f)).mtimeMs }))
        : [];
      const render = renders.sort((a, b) => b.at - a.at)[0] ?? null;
      const resolvedFile = join(dir, "build", "edit.resolved.json");
      if (!existsSync(resolvedFile)) return { slug: d.name, title: d.name, validated: false, render, updated: statSync(dir).mtimeMs };
      try {
        const { resolved, shots, review } = loadReel(dir);
        return {
          slug: d.name,
          title: resolved.title,
          validated: true,
          duration: resolved.duration,
          shots: shots.length,
          counts: counts(review, shots),
          statuses: shots.map((s) => review.shots[s.id]?.status ?? "waiting"),
          render,
          resolved,
          updated: statSync(resolvedFile).mtimeMs,
        };
      } catch {
        return { slug: d.name, title: d.name, validated: false, render, updated: statSync(dir).mtimeMs };
      }
    })
    .sort((a, b) => b.updated - a.updated);
};

// The review board's local server: Vite serves the React app and the project files
// (the same `projects/` public dir Remotion renders from), and a small JSON API reads and
// writes review.json. Nothing here calls a model; Claude Code reads the feedback with `reel feedback`.
import { createServer as createHttp, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, statSync, watch } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createVite } from "vite";
import { listProjects, loadReel, saveReview } from "./store.ts";
import type { Status } from "./model.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const TYPES: Record<string, string> = {
  ".mp4": "video/mp4", ".m4a": "audio/mp4", ".wav": "audio/wav", ".mp3": "audio/mpeg", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json",
};

// Project files are served straight from disk, with byte ranges so video can seek. Vite's public
// dir only knows the files that existed when it started, so a preview or mix made afterwards
// would come back as the app's HTML page instead.
const serveProjectFile = (projects: string, req: IncomingMessage, res: ServerResponse): boolean => {
  const path = decodeURIComponent((req.url ?? "").split(/[?#]/)[0]);
  const file = normalize(join(projects, path));
  if (!file.startsWith(projects + sep) || !existsSync(file) || !statSync(file).isFile()) return false;
  const size = statSync(file).size;
  const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if (range) {
    const start = range[1] ? +range[1] : size - +range[2];
    const end = range[1] && range[2] ? Math.min(+range[2], size - 1) : size - 1;
    res.writeHead(206, { "content-type": type, "content-length": end - start + 1, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "cache-control": "no-cache" });
    createReadStream(file, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes", "cache-control": "no-cache" });
    createReadStream(file).pipe(res);
  }
  return true;
};

const body = (req: IncomingMessage) =>
  new Promise<Record<string, unknown>>((ok, fail) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      try {
        ok(s ? JSON.parse(s) : {});
      } catch (e) {
        fail(e);
      }
    });
  });

const send = (res: ServerResponse, code: number, data: unknown) => {
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
};

export async function startReview(root: string, port = 4317) {
  const projects = join(root, "projects");
  const project = (slug: string) => {
    const dir = join(projects, slug);
    if (!/^[\w.-]+$/.test(slug) || !existsSync(dir)) throw Object.assign(new Error(`no project ${slug}`), { code: 404 });
    return dir;
  };

  // Board pages listening for plan changes.
  const clients = new Set<ServerResponse>();
  let timer: NodeJS.Timeout | undefined;
  const pending = new Set<string>();
  watch(projects, { recursive: true }, (_e, file) => {
    const f = String(file ?? "");
    if (!/build[/\\]edit\.resolved\.json$|renders[/\\][^/\\]+\.mp4$/.test(f)) return;
    pending.add(f.split(/[/\\]/)[0]);
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const slug of pending) for (const c of clients) c.write(`data: ${JSON.stringify({ slug })}\n\n`);
      pending.clear();
    }, 200);
  });

  const api = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
    if (parts[0] === "events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(": hi\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (parts[0] === "projects") return send(res, 200, listProjects(root));
    if (parts[0] !== "reel" || !parts[1]) return send(res, 404, { error: "not found" });
    const dir = project(parts[1]);
    if (req.method === "GET") {
      const { resolved, shots, review, reel } = loadReel(dir);
      return send(res, 200, { resolved, shots, review, reel });
    }
    if (req.method !== "PUT") return send(res, 405, { error: "method" });
    const input = await body(req);
    const current = loadReel(dir);
    const review = current.review;
    const at = new Date().toISOString();
    if (parts[2] === "notes") {
      review.notes = { text: String(input.text ?? ""), hash: current.reel, at };
    } else if (parts[2] === "shot" && parts[3]) {
      const shot = current.shots.find((s) => s.id === parts[3]);
      // The plan moved under the board: refuse, and let it reload.
      if (!shot || shot.hash !== input.hash) return send(res, 409, { error: "this shot changed; reloading" });
      const entry = review.shots[shot.id];
      if (input.status !== undefined) {
        if (!["waiting", "approved", "change"].includes(String(input.status))) return send(res, 400, { error: "bad status" });
        entry.status = input.status as Status;
      }
      if (input.comment !== undefined) entry.comment = String(input.comment);
      entry.at = at;
    } else return send(res, 404, { error: "not found" });
    saveReview(dir, review);
    return send(res, 200, { review });
  };

  const vite = await createVite({
    root: HERE,
    publicDir: projects,
    appType: "spa",
    logLevel: "warn",
    server: { middlewareMode: true, watch: { ignored: ["**/projects/**"] } },
    // Project files can be large videos; the board never needs them pre-bundled.
    optimizeDeps: { include: ["react", "react-dom/client", "react/jsx-runtime", "remotion", "@remotion/player", "@remotion/media"] },
  });

  const server = createHttp((req, res) => {
    if (req.url?.startsWith("/api/"))
      return void api(req, res).catch((e) => send(res, e.code === 404 ? 404 : 500, { error: String(e.message ?? e) }));
    if (serveProjectFile(join(root, "projects"), req, res)) return;
    vite.middlewares(req, res);
  });

  const listen = (p: number): Promise<number> =>
    new Promise((ok, fail) => {
      server.once("error", (e: NodeJS.ErrnoException) => (e.code === "EADDRINUSE" && p < port + 20 ? ok(listen(p + 1)) : fail(e)));
      server.listen(p, "127.0.0.1", () => ok(p));
    });
  const bound = await listen(port);
  return { url: `http://localhost:${bound}`, close: () => (server.close(), vite.close()) };
}

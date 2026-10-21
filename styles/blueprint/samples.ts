// Illustrative assets for the style lab, drawn inline so the catalog needs no files. Each one says
// it is a sample on its face: these stand in for real captures, thumbnails and logos, which a
// real reel always takes from the source (see docs/STYLE.md).

const svg = (w: number, h: number, body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;
const font = `font-family="Helvetica Neue, Helvetica, Arial, sans-serif"`;
const bar = (x: number, y: number, w: number, h = 16, fill = "#DADDE2") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;

// A plain page standing in for a capture: a heading, a highlighted line, paragraphs as bars.
export const SAMPLE_PAGE_SIZE: [number, number] = [1600, 1000];
export const samplePage = () =>
  svg(
    1600,
    1000,
    `<rect width="1600" height="1000" fill="#FFFFFF"/>
     <rect x="0" y="0" width="1600" height="88" fill="#F5F6F8"/>
     ${bar(64, 36, 180, 16, "#C6CBD2")}${bar(1300, 36, 236, 16, "#DADDE2")}
     <text x="120" y="230" ${font} font-weight="700" font-size="76" fill="#0E1013">Sample page</text>
     <text x="120" y="300" ${font} font-size="34" fill="#6E737B">Illustration of a capture. A real reel shows the source itself.</text>
     ${[0, 1, 2, 3].map((i) => bar(120, 380 + i * 44, [1180, 1240, 1100, 760][i])).join("")}
     <text x="120" y="610" ${font} font-weight="700" font-size="44" fill="#0E1013">The line being discussed</text>
     ${[0, 1, 2, 3, 4].map((i) => bar(120, 670 + i * 44, [1260, 1200, 1320, 1080, 640][i])).join("")}`,
  );

// A neutral monogram standing in for an official logo. Never a real mark.
export const sampleLogo = (letter: string, i = 0) =>
  svg(
    200,
    200,
    `<rect x="10" y="10" width="180" height="180" rx="44" fill="${["#0E1013", "#2563EB", "#6E737B", "#C6CBD2"][i % 4]}"/>
     <text x="100" y="128" text-anchor="middle" ${font} font-weight="700" font-size="84" fill="${i % 4 === 3 ? "#0E1013" : "#FFFFFF"}">${letter}</text>`,
  );

// A 16:9 thumbnail standing in for a real one, numbered.
export const sampleThumb = (n: number) =>
  svg(
    640,
    360,
    `<rect width="640" height="360" fill="${n % 2 ? "#E2E5EA" : "#D3D7DD"}"/>
     <rect x="40" y="40" width="${200 + (n % 3) * 60}" height="22" rx="11" fill="#FFFFFF"/>
     ${bar(40, 82, 300, 14, "#FFFFFF")}${bar(40, 108, 220, 14, "#FFFFFF")}
     <text x="600" y="320" text-anchor="end" ${font} font-weight="700" font-size="40" fill="#6E737B">Sample ${n}</text>`,
  );

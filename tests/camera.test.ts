import { describe, expect, it } from "vitest";
import { frameRect } from "../src/camera.ts";

// A tall page (a README captured at phone width) and two panel shapes.
const iw = 908;
const ih = 14938;

const visible = (rect: [number, number, number, number], vw: number, vh: number) => {
  const { k, left, top } = frameRect(rect, iw, ih, vw, vh);
  // Screen position of the rect's corners.
  const x0 = left + rect[0] * iw * k;
  const y0 = top + rect[1] * ih * k;
  const x1 = left + (rect[0] + rect[2]) * iw * k;
  const y1 = top + (rect[1] + rect[3]) * ih * k;
  return { x0, y0, x1, y1, k };
};

describe("frameRect", () => {
  it("keeps a full-width rect fully visible in a wide panel", () => {
    const v = visible([0, 0.1, 1, 0.04], 960, 666);
    expect(v.x0).toBeGreaterThanOrEqual(-0.5);
    expect(v.x1).toBeLessThanOrEqual(960.5);
  });

  it("keeps the same rect fully visible in a squarer panel by showing more page", () => {
    const v = visible([0, 0.1, 1, 0.04], 960, 900);
    expect(v.x0).toBeGreaterThanOrEqual(-0.5);
    expect(v.x1).toBeLessThanOrEqual(960.5);
    expect(v.y0).toBeGreaterThanOrEqual(0);
    expect(v.y1).toBeLessThanOrEqual(900);
  });

  it("fills the panel: the image always covers it", () => {
    const { k, left, top } = frameRect([0.2, 0.5, 0.3, 0.01], iw, ih, 960, 900);
    expect(left).toBeLessThanOrEqual(0.5);
    expect(top).toBeLessThanOrEqual(0.5);
    expect(left + iw * k).toBeGreaterThanOrEqual(959.5);
    expect(top + ih * k).toBeGreaterThanOrEqual(899.5);
  });

  it("zooms in on a small region", () => {
    expect(visible([0.2, 0.5, 0.3, 0.01], 960, 900).k).toBeGreaterThan(3);
  });
});

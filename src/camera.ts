// Camera framing for captures. A rect is the region that must be visible. The camera
// widens it to the viewport's shape using the surrounding image, so the panel is always
// full and the region is never cropped, whatever the panel's proportions.
// Only when the image itself runs out in that direction does the region get cropped.

export type Rect = [number, number, number, number];

// Returns the scale (screen px per image px) and the image offset for a normalised rect.
export const frameRect = (rect: Rect, iw: number, ih: number, vw: number, vh: number) => {
  let rw = rect[2] * iw;
  let rh = rect[3] * ih;
  const cx = (rect[0] + rect[2] / 2) * iw;
  const cy = (rect[1] + rect[3] / 2) * ih;
  const aspect = vw / vh;
  if (rw / rh > aspect) rh = rw / aspect;
  else rw = rh * aspect;
  // Shift back inside the image where there is room.
  const x0 = rw >= iw ? cx - rw / 2 : Math.min(Math.max(cx - rw / 2, 0), iw - rw);
  const y0 = rh >= ih ? cy - rh / 2 : Math.min(Math.max(cy - rh / 2, 0), ih - rh);
  // If the image is too small in one direction, cover rather than leave a gap.
  const k = Math.max(vw / rw, vh / rh, vw / iw, vh / ih);
  const left = -(x0 + rw / 2) * k + vw / 2;
  const top = -(y0 + rh / 2) * k + vh / 2;
  return { k, left, top };
};

// One camera move per shot. Every camera in the reel (a capture's from-to move, the speaker's
// push-in, a shared-element transition) runs on this one curve, and a shot that enters through a
// shared element holds its own camera until the transition has landed, so two moves never overlap.
export const TRANSITION = 0.7;
export const cameraEase = (x: number) => 1 - Math.pow(1 - x, 3);
export const cameraProgress = (start: number, end: number, time: number, hold = 0) => {
  const a = start + hold;
  if (end <= a) return time >= end ? 1 : 0;
  return cameraEase(Math.min(1, Math.max(0, (time - a) / (end - a))));
};

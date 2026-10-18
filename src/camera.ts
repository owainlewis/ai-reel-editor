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

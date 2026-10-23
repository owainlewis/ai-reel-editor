// Which composition renders a plan, and at what size.
export const compositionFor = (canvas: "reel" | "youtube" | undefined) =>
  canvas === "youtube" ? { id: "Wide", width: 1920, height: 1080 } : { id: "Reel", width: 1080, height: 1920 };

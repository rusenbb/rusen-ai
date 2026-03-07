// Load PNG files and extract raw pixel data as uint32 values.
// We decode PNG bytes directly (instead of canvas readback) to avoid
// browser-specific pixel perturbations that break the compressed datasets.

import UPNG from "upng-js";

function packRgbaToArgbLikeHaxe(
  r: number,
  g: number,
  b: number,
  a: number,
): number {
  // Haxe format.png.Tools.extract32 yields uint32 values where bytes map to:
  // value = B | (G << 8) | (R << 16) | (A << 24)
  return b | (g << 8) | (r << 16) | (a << 24);
}

export async function loadPNGPixels(url: string): Promise<number[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load PNG: ${url} (${response.status})`);
  }
  const buffer = await response.arrayBuffer();

  const decoded = UPNG.decode(buffer);
  const frames = UPNG.toRGBA8(decoded);
  if (frames.length === 0) {
    throw new Error(`Decoded PNG has no frames: ${url}`);
  }

  const rgba = new Uint8Array(frames[0]);
  const pixels: number[] = new Array(decoded.width * decoded.height);
  for (let i = 0; i < pixels.length; i++) {
    const offset = i * 4;
    pixels[i] = packRgbaToArgbLikeHaxe(
      rgba[offset],
      rgba[offset + 1],
      rgba[offset + 2],
      rgba[offset + 3],
    );
  }
  return pixels;
}

export async function loadAllData(
  basePath: string,
): Promise<{ graph: number[]; anim: number[]; loc: number[] }> {
  const [graph, anim, loc] = await Promise.all([
    loadPNGPixels(`${basePath}/graph.png`),
    loadPNGPixels(`${basePath}/anim.png`),
    loadPNGPixels(`${basePath}/loc.png`),
  ]);
  return { graph, anim, loc };
}

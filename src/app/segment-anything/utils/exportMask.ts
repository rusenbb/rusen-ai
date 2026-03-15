import type { ExportBackground } from "../types";

/**
 * Load an image from a URL into an HTMLImageElement.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for export"));
    img.src = url;
  });
}

/**
 * Create an offscreen canvas (or fallback to a regular one).
 */
function makeCanvas(w: number, h: number) {
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(w, h);
  } else {
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  return { canvas, ctx };
}

/**
 * Download the segmented selection with a chosen background.
 *
 * Keeps only the pixels where maskData > 0.
 * Background can be transparent, black, or white.
 */
export async function exportSelection(
  imageUrl: string,
  maskData: Float32Array,
  maskWidth: number,
  maskHeight: number,
  background: ExportBackground
): Promise<void> {
  const img = await loadImage(imageUrl);
  const { canvas, ctx } = makeCanvas(maskWidth, maskHeight);

  // Fill background
  if (background === "black") {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, maskWidth, maskHeight);
  } else if (background === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, maskWidth, maskHeight);
  }
  // transparent = leave clear (default for PNG)

  // Draw the original image scaled to mask dimensions
  ctx.drawImage(img, 0, 0, maskWidth, maskHeight);

  // Apply mask as alpha: clear pixels where mask is off
  const imageData = ctx.getImageData(0, 0, maskWidth, maskHeight);
  const pixels = imageData.data;

  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i] <= 0) {
      const idx = i * 4;
      if (background === "transparent") {
        // Set to fully transparent
        pixels[idx + 0] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      } else if (background === "black") {
        pixels[idx + 0] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      } else {
        // white
        pixels[idx + 0] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  await downloadCanvas(canvas, "segment-selection.png");
}

/**
 * Download the image with the selected region removed.
 *
 * Removes (makes transparent or fills) the pixels where maskData > 0.
 */
export async function exportWithRemoval(
  imageUrl: string,
  maskData: Float32Array,
  maskWidth: number,
  maskHeight: number,
  fill: ExportBackground
): Promise<void> {
  const img = await loadImage(imageUrl);
  const { canvas, ctx } = makeCanvas(maskWidth, maskHeight);

  // Draw the original image
  ctx.drawImage(img, 0, 0, maskWidth, maskHeight);

  // Remove pixels where mask is ON
  const imageData = ctx.getImageData(0, 0, maskWidth, maskHeight);
  const pixels = imageData.data;

  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i] > 0) {
      const idx = i * 4;
      if (fill === "transparent") {
        pixels[idx + 0] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      } else if (fill === "black") {
        pixels[idx + 0] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx + 0] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  await downloadCanvas(canvas, "segment-removed.png");
}

/**
 * Convert a canvas to a blob and trigger a download.
 */
async function downloadCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  filename: string
): Promise<void> {
  let blob: Blob | null;

  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: "image/png" });
  } else {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
  }

  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

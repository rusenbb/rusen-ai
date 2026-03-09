const IMAGE_SIZE = 1008;

/**
 * Load a File as an HTMLImageElement.
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Preprocess an image for SAM3's image encoder.
 * Resizes to 1008x1008 and converts RGBA → RGB in CHW uint8 format.
 * Returns a Uint8Array of shape [3, 1008, 1008].
 */
export function preprocessImage(img: HTMLImageElement): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_SIZE;
  canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
  const imageData = ctx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);

  // RGBA (HWC) → RGB (CHW)
  const pixels = IMAGE_SIZE * IMAGE_SIZE;
  const rgb = new Uint8Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    rgb[i] = imageData.data[i * 4]; // R
    rgb[pixels + i] = imageData.data[i * 4 + 1]; // G
    rgb[2 * pixels + i] = imageData.data[i * 4 + 2]; // B
  }
  return rgb;
}

/**
 * Render a segmentation mask as a semi-transparent overlay on a canvas.
 * The mask is expected to be a Float32Array with values in [0, 1].
 */
export function renderMaskOverlay(
  ctx: CanvasRenderingContext2D,
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  color: [number, number, number] = [59, 130, 246], // blue-500
  opacity: number = 0.4
): void {
  // Create a temporary canvas at mask resolution
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext("2d")!;
  const imageData = maskCtx.createImageData(maskWidth, maskHeight);

  for (let i = 0; i < maskWidth * maskHeight; i++) {
    const v = mask[i];
    if (v > 0.5) {
      imageData.data[i * 4] = color[0];
      imageData.data[i * 4 + 1] = color[1];
      imageData.data[i * 4 + 2] = color[2];
      imageData.data[i * 4 + 3] = Math.round(opacity * 255);
    }
    // else: fully transparent
  }

  maskCtx.putImageData(imageData, 0, 0);

  // Scale mask to canvas size
  ctx.drawImage(maskCanvas, 0, 0, canvasWidth, canvasHeight);
}

export type MaskFill =
  | { type: "transparent" }
  | { type: "color"; r: number; g: number; b: number };

/**
 * Apply a segmentation mask to an image.
 *
 * keep "subject"    → preserves the masked region
 * keep "background" → preserves everything outside the mask
 *
 * The replaced region is filled with the given fill (transparent or a solid color).
 * Returns a canvas at the original image resolution.
 */
export function applyMask(
  img: HTMLImageElement,
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
  keep: "subject" | "background",
  fill: MaskFill
): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // 1. Build binary alpha mask at model resolution
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext("2d")!;
  const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

  for (let i = 0; i < maskWidth * maskHeight; i++) {
    const isSubject = mask[i] > 0.5;
    const keepPixel = keep === "subject" ? isSubject : !isSubject;
    maskImageData.data[i * 4] = 255;
    maskImageData.data[i * 4 + 1] = 255;
    maskImageData.data[i * 4 + 2] = 255;
    maskImageData.data[i * 4 + 3] = keepPixel ? 255 : 0;
  }
  maskCtx.putImageData(maskImageData, 0, 0);

  // 2. Create masked image (kept region only, rest transparent)
  const masked = document.createElement("canvas");
  masked.width = w;
  masked.height = h;
  const maskedCtx = masked.getContext("2d")!;
  maskedCtx.drawImage(img, 0, 0);
  maskedCtx.globalCompositeOperation = "destination-in";
  maskedCtx.drawImage(maskCanvas, 0, 0, w, h);

  if (fill.type === "transparent") return masked;

  // 3. Colored fill: solid background + masked image on top
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = `rgb(${fill.r},${fill.g},${fill.b})`;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(masked, 0, 0);

  return out;
}

/**
 * Trigger a PNG download from a canvas element.
 */
export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string
): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/**
 * Draw a bounding box on a canvas.
 */
export function renderBoundingBox(
  ctx: CanvasRenderingContext2D,
  box: number[],
  score: number,
  label: string,
  color: string = "#3b82f6"
): void {
  const [x1, y1, x2, y2] = box;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

  // Label background
  const text = `${label}: ${(score * 100).toFixed(1)}%`;
  ctx.font = "14px var(--font-geist-mono), monospace";
  const metrics = ctx.measureText(text);
  const labelHeight = 20;
  const labelY = y1 > labelHeight ? y1 - labelHeight : y1;

  ctx.fillStyle = color;
  ctx.fillRect(x1, labelY, metrics.width + 8, labelHeight);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x1 + 4, labelY + 15);
}

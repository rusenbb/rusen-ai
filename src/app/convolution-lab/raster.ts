import { rgbRasterFromRgba, type RgbRaster } from "./convolution";

export const MAX_RASTER_EDGE = 256;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function processedDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge = MAX_RASTER_EDGE,
): { width: number; height: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0 || maxEdge <= 0) {
    throw new Error("Image dimensions and processing size must be positive.");
  }

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function imageUploadError(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Choose an image smaller than 12 MB.";
  }
  return null;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image could not be decoded."));
    image.src = source;
  });
}

export async function decodeRaster(source: string, maxEdge = MAX_RASTER_EDGE): Promise<RgbRaster> {
  const image = await loadImage(source);
  const { width, height } = processedDimensions(image.naturalWidth, image.naturalHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser does not support 2D canvas processing.");

  // Transparent uploads are composited over white before extracting pixel values.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  return rgbRasterFromRgba(pixels, width, height);
}

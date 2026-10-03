/** Result boundary for real inference engines. Authored tracks never enter this type. */
export type MaskRun = {
  /** Row-major binary mask. Runs alternate background/foreground, beginning with background. */
  counts: number[];
  width: number;
  height: number;
};

export type InferredObject = {
  id: number;
  label: string;
  /** Model confidence when the engine provides it; not a fabricated tracking score. */
  score: number | null;
  mask: MaskRun;
};

export type InferredVideoFrame = {
  /** Presentation time in the original video, in seconds. */
  time: number;
  objects: InferredObject[];
};

export type InferenceProvenance = {
  modelId: string;
  revision: string;
  runtime: "browser" | "server";
  tracking: "model-memory" | "detection-association";
};

export function decodeMask({ width, height, counts }: MaskRun): Uint8Array {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 16_777_216
  ) {
    throw new Error("Invalid mask dimensions.");
  }
  const length = width * height;
  // Validate the complete stream before allocation, including untrusted server results.
  let total = 0;
  for (const count of counts) {
    if (!Number.isSafeInteger(count) || count < 0 || total + count > length) {
      throw new Error("Invalid mask run length.");
    }
    total += count;
  }
  if (total !== length) throw new Error("Mask runs do not cover the image.");
  const data = new Uint8Array(length);
  let offset = 0;
  counts.forEach((count, index) => {
    if (index % 2 === 1) data.fill(1, offset, offset + count);
    offset += count;
  });
  return data;
}

export function encodeMask(
  data: Uint8Array,
  width: number,
  height: number,
): MaskRun {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height !== data.length ||
    data.length > 16_777_216
  ) {
    throw new Error("Mask dimensions do not match its pixels.");
  }
  const counts: number[] = [];
  let current = 0;
  let length = 0;
  for (const pixel of data) {
    const binary = pixel > 0 ? 1 : 0;
    if (binary !== current) {
      counts.push(length);
      length = 0;
      current = binary;
    }
    length++;
  }
  counts.push(length);
  return { width, height, counts };
}

/** Bounded sampling plan shared by browser extraction and a future server worker. */
export function planVideoFrames(
  duration: number,
  start: number,
  end: number,
  samples: number,
): number[] {
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("A finite video duration is required.");
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    end > duration ||
    end - start > 12
  ) {
    throw new Error("Select a segment of up to 12 seconds inside the video.");
  }
  if (!Number.isInteger(samples) || samples < 2 || samples > 48)
    throw new Error("Choose 2–48 sampled frames.");
  // A timestamp equal to duration can point beyond the final decodable frame.
  const last = Math.min(end, duration - Math.min(0.05, duration / 100));
  if (last <= start)
    throw new Error(
      "The selected segment is too close to the end of the video.",
    );
  return Array.from(
    { length: samples },
    (_, index) => start + ((last - start) * index) / (samples - 1),
  );
}

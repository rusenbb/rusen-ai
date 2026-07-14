export type Matrix = number[][];

export type ResponseAnchorKind = "positive" | "negative" | "flat";

export type ResponseAnchor = {
  row: number;
  col: number;
  value: number;
};

export type RgbRaster = {
  width: number;
  height: number;
  red: Matrix;
  green: Matrix;
  blue: Matrix;
};

export type KernelPreset = "edge" | "blur" | "sharpen" | "identity";

export const KERNEL_PRESETS: Record<KernelPreset, { label: string; matrix: Matrix }> = {
  edge: {
    label: "Vertical edge",
    matrix: [
      [-1, 0, 1],
      [-1, 0, 1],
      [-1, 0, 1],
    ],
  },
  blur: {
    label: "Box blur",
    matrix: [
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
    ],
  },
  sharpen: {
    label: "Sharpen",
    matrix: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
  },
  identity: {
    label: "Identity",
    matrix: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
};

export function rgbRasterFromRgba(data: ArrayLike<number>, width: number, height: number): RgbRaster {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Raster dimensions must be positive integers.");
  }
  if (data.length < width * height * 4) {
    throw new Error("RGBA data is shorter than the declared raster dimensions.");
  }

  const red: Matrix = [];
  const green: Matrix = [];
  const blue: Matrix = [];

  for (let row = 0; row < height; row++) {
    const redRow: number[] = [];
    const greenRow: number[] = [];
    const blueRow: number[] = [];
    for (let col = 0; col < width; col++) {
      const index = (row * width + col) * 4;
      redRow.push(Number(data[index]));
      greenRow.push(Number(data[index + 1]));
      blueRow.push(Number(data[index + 2]));
    }
    red.push(redRow);
    green.push(greenRow);
    blue.push(blueRow);
  }

  return { width, height, red, green, blue };
}

export function luminanceFromRgb(red: number, green: number, blue: number): number {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function luminanceMatrix(raster: RgbRaster): Matrix {
  return raster.red.map((row, rowIndex) =>
    row.map((red, columnIndex) =>
      luminanceFromRgb(red, raster.green[rowIndex][columnIndex], raster.blue[rowIndex][columnIndex]),
    ),
  );
}

export function convolveRgbDepthwise(
  raster: RgbRaster,
  kernel: Matrix,
  options: { stride?: number; padding?: number } = {},
): RgbRaster {
  const red = convolve2d(raster.red, kernel, options);
  const green = convolve2d(raster.green, kernel, options);
  const blue = convolve2d(raster.blue, kernel, options);
  return {
    width: red[0]?.length ?? 0,
    height: red.length,
    red,
    green,
    blue,
  };
}

function clampByte(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

export function rgbRasterToRgba(raster: RgbRaster): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(raster.width * raster.height * 4);
  for (let row = 0; row < raster.height; row++) {
    for (let col = 0; col < raster.width; col++) {
      const index = (row * raster.width + col) * 4;
      rgba[index] = clampByte(raster.red[row][col]);
      rgba[index + 1] = clampByte(raster.green[row][col]);
      rgba[index + 2] = clampByte(raster.blue[row][col]);
      rgba[index + 3] = 255;
    }
  }
  return rgba;
}

export function normalisedRgbRasterToRgba(raster: RgbRaster): Uint8ClampedArray {
  if (!raster.width || !raster.height) return new Uint8ClampedArray();
  const asByteMatrix = (matrix: Matrix) =>
    normaliseMatrix(matrix).map((row) => row.map((value) => value * 255));
  return rgbRasterToRgba({
    ...raster,
    red: asByteMatrix(raster.red),
    green: asByteMatrix(raster.green),
    blue: asByteMatrix(raster.blue),
  });
}

export function grayscaleMatrixToRgba(matrix: Matrix): Uint8ClampedArray {
  const height = matrix.length;
  const width = matrix[0]?.length ?? 0;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = (row * width + col) * 4;
      const value = clampByte(matrix[row][col]);
      rgba[index] = value;
      rgba[index + 1] = value;
      rgba[index + 2] = value;
      rgba[index + 3] = 255;
    }
  }
  return rgba;
}

export function signedMatrixToRgba(matrix: Matrix): Uint8ClampedArray {
  const height = matrix.length;
  const width = matrix[0]?.length ?? 0;
  const maxMagnitude = Math.max(1, ...matrix.flat().map((value) => Math.abs(value)));
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = (row * width + col) * 4;
      const value = matrix[row][col] / maxMagnitude;
      const strength = Math.abs(value);
      const base = 18 * (1 - strength);
      rgba[index] = clampByte(base + (value >= 0 ? 245 * strength : 24 * strength));
      rgba[index + 1] = clampByte(base + (value >= 0 ? 138 * strength : 190 * strength));
      rgba[index + 2] = clampByte(base + (value >= 0 ? 61 * strength : 238 * strength));
      rgba[index + 3] = 255;
    }
  }
  return rgba;
}

export function convolve2d(
  input: Matrix,
  kernel: Matrix,
  options: { stride?: number; padding?: number } = {},
): Matrix {
  const stride = options.stride ?? 1;
  const padding = options.padding ?? 0;
  if (input.length === 0 || input[0].length === 0 || kernel.length === 0 || kernel[0].length === 0) return [];

  const outputRows = Math.floor((input.length + padding * 2 - kernel.length) / stride) + 1;
  const outputCols = Math.floor((input[0].length + padding * 2 - kernel[0].length) / stride) + 1;
  if (outputRows <= 0 || outputCols <= 0) return [];

  return Array.from({ length: outputRows }, (_, outputRow) =>
    Array.from({ length: outputCols }, (_, outputCol) => {
      let total = 0;
      for (let kernelRow = 0; kernelRow < kernel.length; kernelRow++) {
        for (let kernelCol = 0; kernelCol < kernel[0].length; kernelCol++) {
          const inputRow = outputRow * stride + kernelRow - padding;
          const inputCol = outputCol * stride + kernelCol - padding;
          if (inputRow >= 0 && inputRow < input.length && inputCol >= 0 && inputCol < input[0].length) {
            total += input[inputRow][inputCol] * kernel[kernelRow][kernelCol];
          }
        }
      }
      return total;
    }),
  );
}

export function maxPool(input: Matrix, size = 2, stride = 2): Matrix {
  if (input.length === 0 || input[0].length === 0) return [];
  const outputRows = Math.floor((input.length - size) / stride) + 1;
  const outputCols = Math.floor((input[0].length - size) / stride) + 1;
  if (outputRows <= 0 || outputCols <= 0) return [];

  return Array.from({ length: outputRows }, (_, outputRow) =>
    Array.from({ length: outputCols }, (_, outputCol) => {
      let largest = Number.NEGATIVE_INFINITY;
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          largest = Math.max(largest, input[outputRow * stride + row][outputCol * stride + col]);
        }
      }
      return largest;
    }),
  );
}

/** Applies the nonlinearity commonly placed before a CNN pooling layer. */
export function reluMatrix(input: Matrix): Matrix {
  return input.map((row) => row.map((value) => Math.max(0, value)));
}

/**
 * Finds a response worth inspecting without inventing a hand-picked coordinate.
 * Positive and negative anchors only exist when the requested sign is present.
 */
export function findResponseAnchor(
  input: Matrix,
  kind: ResponseAnchorKind,
): ResponseAnchor | null {
  let anchor: ResponseAnchor | null = null;

  input.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (kind === "positive" && value <= 0) return;
      if (kind === "negative" && value >= 0) return;

      if (!anchor) {
        anchor = { row: rowIndex, col: colIndex, value };
        return;
      }

      if (kind === "positive" && value > anchor.value) {
        anchor = { row: rowIndex, col: colIndex, value };
      }
      if (kind === "negative" && value < anchor.value) {
        anchor = { row: rowIndex, col: colIndex, value };
      }
      if (kind === "flat" && Math.abs(value) < Math.abs(anchor.value)) {
        anchor = { row: rowIndex, col: colIndex, value };
      }
    });
  });

  return anchor;
}

export function matrixRange(matrix: Matrix): { min: number; max: number } {
  const values = matrix.flat();
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function normaliseMatrix(matrix: Matrix): Matrix {
  const { min, max } = matrixRange(matrix);
  if (max === min) return matrix.map((row) => row.map(() => 0.5));
  return matrix.map((row) => row.map((value) => (value - min) / (max - min)));
}

export function receptiveField(
  outputRow: number,
  outputCol: number,
  kernelRows: number,
  kernelColumns: number,
  stride: number,
  padding: number,
): Array<{ row: number; col: number }> {
  return Array.from({ length: kernelRows * kernelColumns }, (_, index) => ({
    row: outputRow * stride + Math.floor(index / kernelColumns) - padding,
    col: outputCol * stride + (index % kernelColumns) - padding,
  }));
}

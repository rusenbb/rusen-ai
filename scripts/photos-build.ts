import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type VariantName = "thumbnail" | "display" | "large";

type VariantConfig = {
  name: VariantName;
  width: number;
  quality: number;
};

type CliOptions = {
  sourceDir: string;
  outputDir: string;
  manifestPath: string;
  baseUrl: string;
};

type PhotoTransform = {
  rotateDegrees: number;
};

type PreparedPhoto = {
  data: Buffer;
  raw?: {
    width: number;
    height: number;
    channels: 1 | 2 | 3 | 4;
  };
  width: number;
  height: number;
};

const VARIANTS: readonly VariantConfig[] = [
  { name: "thumbnail", width: 720, quality: 80 },
  { name: "display", width: 1600, quality: 86 },
  { name: "large", width: 3200, quality: 90 },
];

// Keep one-off editorial corrections here so the selected masters remain untouched.
const PHOTO_TRANSFORMS: Readonly<Partial<Record<string, PhotoTransform>>> = {
  dscf3613: { rotateDegrees: 6.33 },
};

function rawInput(
  width: number,
  height: number,
  channels: number,
): NonNullable<PreparedPhoto["raw"]> {
  if (channels < 1 || channels > 4) {
    throw new Error(`Unsupported channel count: ${channels}`);
  }
  return { width, height, channels: channels as 1 | 2 | 3 | 4 };
}

function largestCenteredCrop(
  width: number,
  height: number,
  rotatedWidth: number,
  rotatedHeight: number,
  degrees: number,
) {
  const radians = (Math.abs(degrees) * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const aspectRatio = width / height;
  const halfHeight = Math.min(
    width / (2 * (aspectRatio * cosine + sine)),
    height / (2 * (aspectRatio * sine + cosine)),
  );

  // A small safety inset prevents interpolation at the rotated boundary from
  // leaving a hairline in the final WebP.
  const cropHeight = Math.floor(halfHeight * 2) - 4;
  const cropWidth = Math.floor(cropHeight * aspectRatio);

  return {
    left: Math.floor((rotatedWidth - cropWidth) / 2),
    top: Math.floor((rotatedHeight - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}

async function preparePhoto(
  source: Buffer,
  width: number,
  height: number,
  transform?: PhotoTransform,
): Promise<PreparedPhoto> {
  if (!transform) return { data: source, width, height };

  // Auto-orientation and the editorial rotation are separate operations, so
  // materialize an uncompressed intermediate instead of recompressing the JPEG.
  const oriented = await sharp(source, { failOn: "warning" })
    .rotate()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const orientedRaw = rawInput(
    oriented.info.width,
    oriented.info.height,
    oriented.info.channels,
  );
  const rotated = await sharp(oriented.data, { raw: orientedRaw })
    .rotate(transform.rotateDegrees, {
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rotatedRaw = rawInput(
    rotated.info.width,
    rotated.info.height,
    rotated.info.channels,
  );
  const crop = largestCenteredCrop(
    oriented.info.width,
    oriented.info.height,
    rotated.info.width,
    rotated.info.height,
    transform.rotateDegrees,
  );
  const prepared = await sharp(rotated.data, { raw: rotatedRaw })
    .extract(crop)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: prepared.data,
    raw: rawInput(
      prepared.info.width,
      prepared.info.height,
      prepared.info.channels,
    ),
    width: prepared.info.width,
    height: prepared.info.height,
  };
}

function createPipeline(photo: PreparedPhoto) {
  if (photo.raw) return sharp(photo.data, { raw: photo.raw });
  return sharp(photo.data, { failOn: "warning" }).rotate();
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(args: string[]): CliOptions {
  let sourceDir = process.env.PHOTO_SOURCE_DIR ?? "";
  let outputDir = "public/photos";
  let manifestPath = "src/content/photos.generated.json";
  let baseUrl = "/photos";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--source") sourceDir = requireValue(args, index++, arg);
    else if (arg === "--output") outputDir = requireValue(args, index++, arg);
    else if (arg === "--manifest") manifestPath = requireValue(args, index++, arg);
    else if (arg === "--base-url") baseUrl = requireValue(args, index++, arg);
    else if (arg === "--help") {
      console.log(
        "Usage: npm run photos:build -- --source <selected-dir> " +
          "[--output public/photos] [--base-url /photos]",
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!sourceDir) {
    throw new Error("Pass --source or set PHOTO_SOURCE_DIR");
  }

  return {
    sourceDir: path.resolve(sourceDir),
    outputDir: path.resolve(outputDir),
    manifestPath: path.resolve(manifestPath),
    baseUrl: baseUrl.replace(/\/+$/, ""),
  };
}

function photoId(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const entries = await fs.readdir(options.sourceDir, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  if (filenames.length === 0) {
    throw new Error(`No JPEG photos found in ${options.sourceDir}`);
  }

  await fs.mkdir(options.outputDir, { recursive: true });
  const photos = [];

  for (const [index, filename] of filenames.entries()) {
    const sourcePath = path.join(options.sourceDir, filename);
    const source = await fs.readFile(sourcePath);
    const id = photoId(filename);
    const transform = PHOTO_TRANSFORMS[id];
    const hash = createHash("sha256").update(source);
    if (transform) hash.update(`\ntransform:${JSON.stringify(transform)}`);
    const sourceHash = hash.digest("hex");
    const version = sourceHash.slice(0, 12);
    const keyPrefix = `${id}/${version}`;
    const metadata = await sharp(source, { failOn: "warning" }).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read dimensions for ${sourcePath}`);
    }
    const orientedWidth = metadata.autoOrient.width;
    const orientedHeight = metadata.autoOrient.height;
    const prepared = await preparePhoto(
      source,
      orientedWidth,
      orientedHeight,
      transform,
    );

    const sources: Record<VariantName, { url: string; width: number }> = {
      thumbnail: { url: "", width: 0 },
      display: { url: "", width: 0 },
      large: { url: "", width: 0 },
    };

    for (const variant of VARIANTS) {
      const relativePath = `${keyPrefix}/${variant.name}.webp`;
      const outputPath = path.join(options.outputDir, relativePath);
      const actualWidth = Math.min(variant.width, prepared.width);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await createPipeline(prepared)
        .resize({ width: variant.width, withoutEnlargement: true })
        .toColourspace("srgb")
        .webp({
          quality: variant.quality,
          effort: 6,
          smartSubsample: true,
        })
        .toFile(outputPath);
      sources[variant.name] = {
        url: `${options.baseUrl}/${relativePath}`,
        width: actualWidth,
      };
    }

    const blurBuffer = await createPipeline(prepared)
      .resize({ width: 32, withoutEnlargement: true })
      .blur(0.5)
      .toColourspace("srgb")
      .webp({ quality: 28, effort: 4 })
      .toBuffer();

    photos.push({
      id,
      filename,
      width: prepared.width,
      height: prepared.height,
      aspectRatio: Number((prepared.width / prepared.height).toFixed(6)),
      sourceHash,
      blurDataUrl: `data:image/webp;base64,${blurBuffer.toString("base64")}`,
      sources,
    });
    console.log(`[${index + 1}/${filenames.length}] ${filename}`);
  }

  const manifest = {
    schemaVersion: 1,
    baseUrl: options.baseUrl,
    photos,
  };
  await fs.mkdir(path.dirname(options.manifestPath), { recursive: true });
  await fs.writeFile(options.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${photos.length} photos to ${options.manifestPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

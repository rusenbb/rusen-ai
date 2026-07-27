import editorialManifest from "@/content/photos.json";
import generatedManifest from "@/content/photos.generated.json";

export type PhotoLocale = keyof typeof editorialManifest.ui;

export type PhotoSource = {
  url: string;
  width: number;
};

type SeriesId = string;

export type PhotoTranslation = {
  alt: string;
  title: string;
  story?: string;
  caption?: string;
};

export type PhotoCredit = {
  href: string;
  translations: Record<PhotoLocale, string>;
};

type SeriesTranslation = {
  title: string;
  description: string;
};

export type Photo = {
  id: string;
  filename: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurDataUrl: string;
  alt: string;
  title: string;
  story?: string;
  caption?: string;
  translations: Record<PhotoLocale, PhotoTranslation>;
  seriesId: SeriesId;
  seriesTitle: string;
  seriesTitles: Record<PhotoLocale, string>;
  seriesCredit?: PhotoCredit;
  sources: {
    thumbnail: PhotoSource;
    display: PhotoSource;
    large: PhotoSource;
  };
};

export type PhotoSeries = {
  id: string;
  number: string;
  title: string;
  description: string;
  translations: Record<PhotoLocale, SeriesTranslation>;
  credit?: PhotoCredit;
  rows: Photo[][];
};

type EditorialEntry = {
  seriesId: SeriesId;
  translations: Record<PhotoLocale, PhotoTranslation>;
};

type EditorialSeries = {
  id: string;
  number: string;
  translations: Record<PhotoLocale, SeriesTranslation>;
  credit?: PhotoCredit;
  rows: string[][];
};

const PHOTO_COPY: Record<string, EditorialEntry> = editorialManifest.photos;
const PROLOGUE_TITLES: Record<PhotoLocale, string> = editorialManifest.prologueTitles;
const SERIES: EditorialSeries[] = editorialManifest.series;

const generatedById = new Map(
  generatedManifest.photos.map((photo) => [photo.id, photo]),
);
const seriesById = new Map(SERIES.map((series) => [series.id, series]));

function resolvePhoto(id: string): Photo {
  const generated = generatedById.get(id);
  const editorial = PHOTO_COPY[id as keyof typeof PHOTO_COPY];
  if (!generated) throw new Error(`Photo ${id} is missing from the generated manifest`);
  if (!editorial) throw new Error(`Photo ${id} is missing editorial copy`);

  let resolvedTitles: Record<PhotoLocale, string>;
  let resolvedCredit: PhotoCredit | undefined;
  if (editorial.seriesId === "prologue") {
    resolvedTitles = PROLOGUE_TITLES;
  } else {
    const series = seriesById.get(editorial.seriesId);
    if (!series) throw new Error(`Series ${editorial.seriesId} is missing copy`);
    resolvedTitles = {
      tr: series.translations.tr.title,
      en: series.translations.en.title,
      ja: series.translations.ja.title,
    };
    resolvedCredit = series.credit;
  }

  for (const locale of Object.keys(editorialManifest.ui) as PhotoLocale[]) {
    const copy = editorial.translations[locale];
    if (!copy.story?.trim() && !copy.caption?.trim()) {
      throw new Error(`Photo ${id} is missing story or caption for ${locale}`);
    }
  }

  return {
    ...generated,
    ...editorial.translations.en,
    translations: editorial.translations,
    seriesId: editorial.seriesId,
    seriesTitle: resolvedTitles.en,
    seriesTitles: resolvedTitles,
    seriesCredit: resolvedCredit,
  };
}

export const heroPhoto = resolvePhoto(editorialManifest.heroPhotoId);
export const photoSeries: PhotoSeries[] = SERIES.map((series) => ({
  id: series.id,
  number: series.number,
  title: series.translations.en.title,
  description: series.translations.en.description,
  translations: series.translations,
  credit: series.credit,
  rows: series.rows.map((row) => row.map(resolvePhoto)),
}));
export const photoRows = photoSeries.flatMap((series) => series.rows);
export const allPhotos = [heroPhoto, ...photoRows.flat()];

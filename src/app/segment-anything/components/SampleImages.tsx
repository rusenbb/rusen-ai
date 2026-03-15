"use client";

export interface SampleImage {
  url: string;
  alt: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  { url: "/segment-anything/samples/dog.jpg", alt: "Dog" },
  { url: "/segment-anything/samples/street.jpg", alt: "Street" },
  { url: "/segment-anything/samples/kitchen.jpg", alt: "Kitchen" },
  { url: "/segment-anything/samples/nature.jpg", alt: "Nature" },
];

interface SampleImagesProps {
  activeUrl: string | null;
  onSelect: (url: string) => void;
  disabled: boolean;
}

export default function SampleImages({
  activeUrl,
  onSelect,
  disabled,
}: SampleImagesProps) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
        Sample Images
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {SAMPLE_IMAGES.map((img) => {
          const isActive = activeUrl === img.url;
          return (
            <button
              key={img.url}
              onClick={() => onSelect(img.url)}
              disabled={disabled}
              className={`group shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                isActive
                  ? "border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20"
                  : "border-transparent hover:border-neutral-300 dark:hover:border-neutral-600"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt}
                className="h-16 w-24 object-cover transition-transform group-hover:scale-105 sm:h-20 sm:w-32"
                loading="lazy"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

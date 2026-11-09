"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { Button, Chip, DemoHeader, DemoPage, Details } from "@/components/ui";
import { DEMO_IMAGES } from "@/lib/demoImages";
import { useVisionClassifier, type VisionResult } from "./hooks/useVisionClassifier";
import { useClipSeg, type AttentionMask } from "./hooks/useClipSeg";
import HeatmapCanvas from "./components/HeatmapCanvas";
import { hasVisibleRegion } from "./maps";
import FullAttentionPanel from "./components/FullAttentionPanel";

const SAMPLES = DEMO_IMAGES.filter((image) => image.suggestedLabels).slice(0, 5);
const FIRST = SAMPLES[0];
const FALLBACK_LABELS = ["a photo of a dog", "a photo of a cat", "a photo of a person", "a photo of food"];
const MIN_LABELS = 2;
const kicker = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";

export default function VisionAnythingPage() {
  const { isLoading, loadProgress, error, classify } = useVisionClassifier();
  const clipSeg = useClipSeg();

  const [imageUrl, setImageUrl] = useState<string>(FIRST.url);
  const [imageAspect, setImageAspect] = useState(4 / 3);
  const [labels, setLabels] = useState<string[]>(FIRST.suggestedLabels ?? FALLBACK_LABELS);
  const [labelInput, setLabelInput] = useState("");
  const [results, setResults] = useState<VisionResult[] | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);
  const [attentionMask, setAttentionMask] = useState<AttentionMask | null>(null);
  const [attentionLabel, setAttentionLabel] = useState<string | null>(null);
  const [attentionBusy, setAttentionBusy] = useState(false);
  const [fullAttention, setFullAttention] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const classificationRequest = useRef(0);
  const attentionRequest = useRef(0);

  // Revoke object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const clearAttention = useCallback(() => {
    attentionRequest.current += 1;
    setAttentionBusy(false);
    setAttentionMask(null);
    setAttentionLabel(null);
    setFullAttention(false);
  }, []);

  const clearResults = useCallback(() => {
    classificationRequest.current += 1;
    setIsClassifying(false);
    setResults(null);
    setClassifyError(null);
    clearAttention();
  }, [clearAttention]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setImageUrl(URL.createObjectURL(file));
      clearResults();
    },
    [clearResults],
  );

  const pickSampleImage = useCallback(
    (url: string) => {
      setImageUrl(url);
      clearResults();
      const sample = DEMO_IMAGES.find((d) => d.url === url);
      if (sample?.suggestedLabels) setLabels(sample.suggestedLabels);
    },
    [clearResults],
  );

  const handleAddLabel = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = labelInput.trim();
    if (!trimmed || labels.includes(trimmed)) return;
    setLabels((prev) => [...prev, trimmed]);
    clearResults();
    setLabelInput("");
  };

  const handleRemoveLabel = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
    clearResults();
  };

  const showAttentionFor = useCallback(
    async (label: string) => {
      const request = ++attentionRequest.current;
      setAttentionBusy(true);
      setAttentionLabel(label);
      try {
        const mask = await clipSeg.segment(imageUrl, label);
        if (request !== attentionRequest.current) return;
        setAttentionMask(mask);
      } catch (err) {
        if (request !== attentionRequest.current) return;
        setClassifyError(err instanceof Error ? err.message : "The map failed");
        setAttentionMask(null);
      } finally {
        if (request === attentionRequest.current) setAttentionBusy(false);
      }
    },
    [imageUrl, clipSeg],
  );

  const handleClassify = useCallback(async () => {
    if (labels.length < MIN_LABELS) return;
    const request = ++classificationRequest.current;
    setIsClassifying(true);
    setClassifyError(null);
    clearAttention();
    try {
      const out = await classify(imageUrl, labels);
      if (request !== classificationRequest.current) return;
      setResults(out);
      setIsClassifying(false);
      // The map for the winning label is the payoff, so it follows on its own.
      if (out[0]) void showAttentionFor(out[0].label);
    } catch (err) {
      if (request === classificationRequest.current) {
        setClassifyError(err instanceof Error ? err.message : "Classification failed");
        setIsClassifying(false);
      }
    }
  }, [imageUrl, labels, classify, clearAttention, showAttentionFor]);

  const top = results?.[0];
  const busy = isClassifying || isLoading;

  let mapNote: string | null = null;
  if (attentionBusy) {
    mapNote =
      clipSeg.status === "loading"
        ? `Downloading the map model · ${clipSeg.progress}%`
        : `Finding "${attentionLabel}" in the image`;
  } else if (attentionMask && attentionLabel) {
    mapNote = hasVisibleRegion(attentionMask.data)
      ? `Where the model sees "${attentionLabel}"`
      : `The map model finds no region for "${attentionLabel}" in this photo`;
  }

  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Zero-shot image classification"
        title="Vision Anything"
        description="Name what might be in the photo; a CLIP model ranks the labels and shows where it sees each one."
      />

      {fullAttention && results && results.length > 0 && (
        <FullAttentionPanel
          imageUrl={imageUrl}
          imageAspect={imageAspect}
          labels={results.map((r) => r.label)}
          initialLabel={attentionLabel ?? results[0].label}
          clipSeg={clipSeg}
          onClose={() => setFullAttention(false)}
        />
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {SAMPLES.map((img) => (
              <button
                key={img.url}
                type="button"
                onClick={() => pickSampleImage(img.url)}
                aria-pressed={imageUrl === img.url}
                aria-label={img.alt}
                className={`shrink-0 cursor-pointer border p-0.5 transition-colors ${
                  imageUrl === img.url ? "border-[var(--line-strong)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="block h-10 w-14 object-cover sm:h-12 sm:w-[4.5rem]" />
              </button>
            ))}
            <Button size="sm" className="ml-1" onClick={() => fileInputRef.current?.click()}>
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Upload your own image"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className="relative mx-auto aspect-[4/3] w-full overflow-hidden border border-[var(--line)] bg-[var(--surface)] lg:max-w-[calc((100svh-22rem)*4/3)]"
          >
            <Image
              src={imageUrl}
              alt="Image to classify"
              fill
              priority
              className="object-contain"
              onLoad={(event) => setImageAspect(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)}
              unoptimized
            />
            {attentionMask && !fullAttention && <HeatmapCanvas mask={attentionMask} imageAspect={imageAspect} />}
          </div>
          <div className="mt-2 flex min-h-[1.75rem] flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className={kicker}>
              {mapNote ?? "Drop an image here or pick one above"}
            </p>
            {results && attentionMask && !fullAttention && (
              <Button variant="ghost" size="sm" onClick={() => setFullAttention(true)}>
                All maps
              </Button>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div>
            <p className={`mb-2 ${kicker}`}>Labels</p>
            <div className="flex flex-wrap items-center gap-2">
              {labels.map((label, i) => (
                <Chip
                  key={label}
                  onRemove={() => handleRemoveLabel(i)}
                  disabled={busy || labels.length <= MIN_LABELS}
                >
                  {label}
                </Chip>
              ))}
              <form onSubmit={handleAddLabel} className="flex">
                <input
                  aria-label="New image classification label"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="+ a photo of a…"
                  disabled={busy}
                  className="w-40 border-b border-dashed border-[var(--line-strong)] bg-transparent px-1 py-1 font-mono text-[0.75rem] focus:outline-none disabled:opacity-50"
                />
              </form>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleClassify}
            loading={busy}
            disabled={labels.length < MIN_LABELS}
          >
            {isLoading ? `Downloading the model · ${loadProgress}%` : isClassifying ? "Classifying" : "Classify"}
          </Button>

          {(classifyError || error || clipSeg.error) && (
            <p role="alert" className="border-l-2 border-[var(--line-strong)] pl-3 text-sm text-[var(--muted)]">
              {classifyError || error || clipSeg.error}
            </p>
          )}

          {top && results ? (
            <div aria-live="polite">
              <p className={kicker}>Best fit</p>
              <p className="mt-1 text-3xl font-semibold first-letter:uppercase sm:text-4xl">{top.label}</p>
              <ul className="mt-5 space-y-1">
                {results.map((r) => {
                  const active = attentionLabel === r.label;
                  return (
                    <li key={r.label}>
                      <button
                        type="button"
                        onClick={() => showAttentionFor(r.label)}
                        disabled={attentionBusy}
                        aria-pressed={active}
                        className="group w-full cursor-pointer py-1 text-left disabled:cursor-wait"
                      >
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span
                            className={
                              active
                                ? "text-[var(--foreground)] underline underline-offset-4"
                                : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
                            }
                          >
                            {r.label}
                          </span>
                          <span className="font-mono tabular-nums">{(r.score * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--line)]">
                          <div
                            className={`h-1.5 transition-all duration-500 ${r === top ? "bg-accent" : "bg-[var(--sub)]"}`}
                            style={{ width: `${r.score * 100}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className={`mt-3 ${kicker}`}>Click a label to see its map</p>
            </div>
          ) : (
            !busy && (
              <p className="text-sm text-[var(--muted)]">
                Press Classify. The first run downloads the ranking model, then the map model.
              </p>
            )
          )}

          <Details summary="Models and tips">
            <p>
              Ranking uses CLIP (Xenova/clip-vit-base-patch16, about 155 MB): it scores how well the image matches each
              label, and the scores add up to 100%. The map uses CLIPSeg (Xenova/clipseg-rd64-refined, about 140 MB), a
              small decoder on top of CLIP that gives each pixel a 0 to 1 match score for one label. Both run on
              WebAssembly in this tab and stay cached after the first download.
            </p>
            <p className="mt-3">
              CLIP ranks full captions better than single words, so write labels like &quot;a photo of a wolf&quot;.
            </p>
          </Details>
        </div>
      </div>
    </DemoPage>
  );
}

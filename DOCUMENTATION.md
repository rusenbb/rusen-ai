# Technical documentation

This document describes the current rusen.ai architecture. Historical plans in
`docs/plans/` may describe experiments or designs that are not live.

## Runtime boundary

rusen.ai is a Next.js App Router application configured with
`output: "export"`. `npm run build` produces a self-contained `out/` directory
for Cloudflare Pages.

Production has:

- static HTML, CSS, JavaScript, JSON, WASM, images, and document downloads;
- browser-side React state and browser storage;
- browser-side model inference and direct calls to public third-party APIs in
  the demos that need live data.

Production does not have:

- a Next.js application server;
- Cloudflare Pages Functions or a Worker API in this repository;
- an OpenRouter proxy, API-key rotation, or runtime secrets;
- a database or server-managed user state.

## Source layout

```text
src/app/
  layout.tsx                 Root document, fonts, metadata, header, footer
  components/               Shared site shell and ambient background
  demos/, nerdy-stuff/      Collection index pages
  bulletin/                 Software index and detail pages
  blogs/                    Markdown indexes, posts, tags, series, RSS
  cv/                       Localized web CV
  photos/                   Localized photography archive
  <project>/                Root-level interactive project routes

src/components/ui/          Shared demo primitives
src/content/                Content and generated manifests
src/lib/                    Loaders, validators, metadata, and registries
public/                     Published assets copied into the static export
scripts/                    Asset generation and offline research tools
```

## Site shell

`src/app/layout.tsx` owns global metadata and renders the shared header,
background, content shell, and footer. Theme state and ambient-background state
are client-side preferences stored in local storage. The background renderer is
suppressed or simplified on routes where it would interfere with dense content.

Navigation data lives in `src/content/navigation.json`. The header resolves the
active collection from the current pathname, so root-level project pages still
select their parent collection.

## Project registry and routes

`src/content/projects.json` is the source of project titles, summaries, status,
collection, tags, and external links. `src/lib/projects.ts` validates and exposes
typed selectors for:

- collection index cards;
- featured homepage projects;
- active navigation state;
- route and social metadata lookup.

Demo and nerdy project pages use root routes such as `/convolution-lab` and
`/emergence`. Bulletin detail pages live under `/bulletin/<slug>`.
`coming-soon` records can appear as disabled cards without having a route.

## Content systems

### Blog

Posts are Markdown/MDX files under `src/content/blog/en/` and
`src/content/blog/tr/`. `src/lib/blog.ts` parses frontmatter, computes reading
time, groups translations and series, and produces tag/series collections.
`src/content/series.json` supplies localized series names.

Post rendering uses `next-mdx-remote` with GFM, math, KaTeX, heading slugs, and
syntax highlighting. Blog routes are statically enumerated during the build.

### Photography

`src/content/photos.json` contains localized editorial copy, series, ordering,
credits, and display transforms. `scripts/photos-build.ts` reads the complete
selected JPEG directory, applies transforms, and writes three immutable WebP
variants per image plus `src/content/photos.generated.json`.

The generated URLs include a source-derived version directory. `public/_headers`
gives those versioned assets a one-year immutable cache policy. Raw originals
remain outside the repository.

### CV

Locale content is stored in `src/content/cv.json`, `cv.tr.json`, and
`cv.ja.json`. The web routes and Markdown endpoints read those files directly.
`scripts/render_cv.py` uses the same data to render public TeX and PDF downloads.
It runs as a PEP 723 `uv` script and requires `tectonic`; Japanese PDF generation
also requires suitable CJK fonts.

### Social previews

`src/content/social-pages.json`, project metadata, blog metadata, and the photo
manifest feed `scripts/social-build.ts`. It generates 1200×630 cards under
`public/social/` and records their metadata in `public/social/manifest.json`.

The build has two checks:

1. `prebuild` verifies that expected cards exist and meet dimension/size rules.
2. `postbuild` inspects exported HTML for canonical, Open Graph, and Twitter
   metadata matching the manifest.

Run `npm run social:build` when source copy or registry data changes.

## Browser-side interactive systems

Many pages are pure TypeScript simulations and visualizations. ML pages load
large libraries or models only in the browser, usually through dynamic imports,
and expose loading/error state while artifacts initialize. Depending on the
demo, browser caches may include Cache Storage or IndexedDB entries.

The Pulse Board is different: it fetches public data sources directly from the
visitor's browser. Availability, CORS policy, response shape, and unauthenticated
rate limits are therefore external runtime dependencies. The site has no proxy
that can normalize or guarantee those APIs.

## Generated computational assets

RL-Arena uses JSON checkpoints in `public/adaptive-arena-checkpoints/` and a
generated TypeScript manifest. The browser fetches only the selected checkpoint.
The canonical offline trainer is `scripts/train_adaptive_arena.py`, a small
entry point to the vectorized PyTorch implementation in `train_arena_gpu.py`.
The older TypeScript trainer is retained for historical comparison and is not
the canonical checkpoint pipeline.

Rusenizer ships a WASM module and merge-rank data under `public/wasm/` and
`public/models/`. Game of Life ships precomputed PNG data under
`public/game-of-life/`.

## Testing and continuous integration

Vitest covers deterministic algorithms, content contracts, metadata, and key
shared interactions. ESLint includes Next.js core-web-vitals and TypeScript
rules. Next's production build supplies the strict TypeScript/static-export
check.

`.github/workflows/ci.yml` runs on pull requests and pushes to `main` with the
repository-pinned Node and npm versions:

```text
npm ci
npm run lint
npm run test:run
npm run build
```

Cloudflare Pages remains the deployment/build check. CI is the independent code
quality gate.

## Deployment

Cloudflare Pages configuration:

- build command: `npm run build`
- output directory: `out`
- runtime environment variables: none

Cloudflare deploys production from `main`. `npm run deploy` is a manual Wrangler
path for an already-built `out/` directory and requires an authenticated account
or appropriate Cloudflare credentials.

The site should be previewed locally with `npm run build && npm start`; `next
start` is incompatible with a static export.

## Offline Python and model-export tools

`pyproject.toml` and `uv.lock` define the reproducible RL training environment.
They intentionally do not claim to reproduce every historical model-export
experiment.

The two SAM3 utilities are specialized:

- `scripts/export_sam3_browser.py` requires an explicit local SAM3 checkout and
  an environment with `samexporter`, TorchVision, ONNX, and optional ONNX
  simplification support.
- `scripts/prepare_sam3_webgpu_models.py` requires ONNX and ONNX Runtime tooling
  and transforms already-exported models.

These utilities are not invoked by the website build, CI, or `uv sync`. Use a
purpose-built research environment and explicit input/output directories so
large model artifacts never enter the web repository accidentally.

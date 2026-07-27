# rusen.ai

Personal portfolio, photography archive, writing, browser-side ML demos, and
interactive computational essays.

Live site: [rusen.ai](https://rusen.ai)

## Architecture

The site is a statically exported Next.js application hosted on Cloudflare
Pages. There is no application server, Pages Function, database, or runtime API
key. Interactive ML demos run in the browser and cache model artifacts locally
when their libraries support it.

The main source areas are:

```text
src/app/             App Router pages and page-specific components
src/components/ui/   Shared UI primitives for interactive demos
src/content/         Project, photography, CV, blog, and navigation content
src/lib/             Content loaders, registries, and shared helpers
public/              Published static and generated assets
scripts/             Asset generation and offline research utilities
```

Project routes are deliberately flat (`/segment-anything`, `/emergence`, and so
on). The `/demos`, `/nerdy-stuff`, and `/bulletin` pages are collection indexes,
not route prefixes.

## Requirements

- Node.js 22.23.1 (see `.nvmrc`)
- npm 11.6.2
- Python 3.12+ and `uv` only for the optional offline scripts

With `nvm` installed:

```bash
nvm use
npm install --global npm@11.6.2
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No `.env` file is required for the current site.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Verify social assets and build the static site into `out/` |
| `npm start` | Serve an existing `out/` directory locally |
| `npm run lint` | Run ESLint |
| `npm run test:run` | Run the Vitest suite once |
| `npm run test:smoke` | Exercise live routes and core interactions against `out/` in Chromium |
| `npm test` | Run Vitest in watch mode |
| `npm run content:check` | Validate project, blog, CV, navigation, and photo content contracts |
| `npm run projects:docs` | Regenerate `PROJECTS.md` from the project content registry |
| `npm run social:build` | Regenerate all social preview cards |
| `npm run social:verify` | Verify expected social preview dimensions and size |
| `npm run photos:build -- --source <dir>` | Build responsive WebP photography assets and their manifest |
| `npm run photos:add -- --source <dir>` | Merge a new photo batch into the generated manifest |
| `npm run photos:verify` | Verify photo copy, layout, variants, and exact generated asset set |
| `npm run photos:prune:dry-run` | Preview obsolete content-addressed photo assets without deleting them |
| `npm run cv:build` | Render all CV locales to committed TeX/PDF artifacts |
| `npm run train:adaptive-arena` | Run the canonical offline RL-Arena trainer |
| `npm run train:adaptive-arena:deps` | Prepare the optional CUDA training environment |
| `npm run train:adaptive-arena:ts` | Run the retained legacy TypeScript trainer |
| `npm run deploy` | Deploy `out/` with an authenticated Wrangler session |

For a local production preview:

```bash
npm run build
npm start
```

`next start` is intentionally not used because Next.js does not support it with
`output: "export"`.

## Content and generated artifacts

- `src/content/projects.json` is the site-facing project registry. Selectors and
  route helpers live in `src/lib/projects.ts`.
- Blog posts are Markdown files under `src/content/blog/{en,tr}/`; shared series
  metadata lives in `src/content/series.json`.
- Photography copy and sequencing live in `src/content/photos.json`.
  `src/content/photos.generated.json` and `public/photos/` are generated from
  the selected source photographs. Raw originals are intentionally not stored
  in this repository.
- CV content lives in the locale JSON files under `src/content/`. The public
  TeX/PDF downloads are generated artifacts and should be committed with their
  source changes.
- Social card sources are derived from content and project metadata. Generated
  cards and `public/social/manifest.json` are committed so local development and
  link previews use the same assets.
- RL-Arena checkpoint JSON and its TypeScript manifest are offline training
  outputs committed for browser inference.

When changing source content, regenerate the related artifacts and include both
the source and outputs in the same pull request.

## Verification and deployment

Pull requests and pushes to `main` run the repository CI workflow with the
pinned Node/npm toolchain:

```text
npm ci -> npm run lint -> npm run test:run -> npm run build -> npm run test:smoke
```

Cloudflare Pages uses `npm run build` and publishes `out/`. Production deploys
from `main`; the local `npm run deploy` command is available for an explicitly
authorized manual deployment.

## Offline Python tooling

`uv sync` reproduces the RL-Arena training environment declared by
`pyproject.toml` and `uv.lock`. The CV renderer is a PEP 723 script and also
requires `tectonic` on `PATH`.

The SAM3 export/preparation scripts are specialized research utilities. They
require an external SAM3 checkout and a separate environment containing the
exporter, ONNX, ONNX Runtime, and TorchVision dependencies; they are not part of
the website build or the general `uv sync` environment. See
[`DOCUMENTATION.md`](./DOCUMENTATION.md) for the boundary.

## More documentation

- [`DOCUMENTATION.md`](./DOCUMENTATION.md) — current architecture and data flows
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — change and verification workflow
- [`PROJECTS.md`](./PROJECTS.md) — human-readable project overview

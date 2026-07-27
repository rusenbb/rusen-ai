# Contributing to rusen.ai

## Setup

Use the repository-pinned toolchain:

```bash
nvm use
npm install --global npm@11.6.2
npm ci
npm run dev
```

The current application is a static site and does not require environment
variables or API keys.

## Repository conventions

- Keep project, navigation, photography, CV, and blog content in `src/content/`.
  Load and validate it through `src/lib/`; do not duplicate content records in
  page components.
- Keep interactive pages at their established root-level routes.
- Reuse the primitives exported by `src/components/ui/` where they match the
  existing page language.
- Preserve strict TypeScript and the existing formatting/style conventions.
- Keep changes surgical. Do not combine unrelated refactors with content or bug
  fixes.
- Do not commit raw photography originals, local model caches, `out/`, `.next/`,
  or environment files.

## Generated files

Some source changes require generated outputs in the same pull request:

- Photography: run `npm run photos:build -- --source <complete-selected-dir>`
  and commit the generated manifest and responsive assets.
- Social cards: run `npm run social:build` and commit the cards plus
  `public/social/manifest.json`.
- CV: run `npm run cv:build` and commit the generated public TeX/PDF files.
- RL-Arena: checkpoint generation is an offline workflow; commit checkpoint JSON
  and `checkpoints.generated.ts` together.

The photography command currently treats its source directory as the complete
selected set, not as an incremental batch.

## Verification

Run the same checks as CI before requesting review:

```bash
npm ci
npm run lint
npm run test:run
npm run build
```

For changes to an interactive or responsive page, also inspect the affected
flow in a real browser at desktop and mobile widths. `npm start` serves the
already-built static export from `out/`.

## Pull requests

Describe:

- the observable behavior or content that changed;
- which generated artifacts changed and why;
- the checks you ran;
- any browser, model, network, or platform behavior you could not verify.

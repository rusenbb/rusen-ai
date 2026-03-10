# Project Practices

These rules apply to any new feature, demo, refactor, or maintenance work in this repository.

## Architecture

- Keep route entrypoints thin. A `page.tsx` should primarily orchestrate layout and high-level state.
- Move heavy rendering, simulation, polling, and feature logic into dedicated components, hooks, or helper modules.
- Prefer extracting logic before a page becomes large, rather than after it becomes hard to understand.
- Reuse shared UI primitives from `src/components/ui` instead of reauthoring page-local panel and header styles.

## New Demos

- New demos should use the shared demo layout primitives in `src/components/ui/DemoLayout.tsx` unless there is a strong reason not to.
- Each new demo should have:
  - a clear header
  - a main interactive area
  - an explanation or “how it works” section
  - graceful loading and error states
- If a demo is computationally heavy, keep the route shell small and split the expensive parts into lazy-loadable or isolated modules.

## Theming

- Every new UI must work in both light and dark mode.
- Do not assume dark mode as the default design target for sub-pages.
- If a demo needs a self-contained visual world, make that explicit with intentional surfaces rather than relying on accidental contrast.
- Avoid hardcoding repeated color recipes inside pages when the same intent already exists in shared components.

## Mobile

- Treat mobile as a first-class target, not a later polish pass.
- Controls must remain tappable and readable on small screens.
- Overlay controls and fullscreen controls must be tested conceptually for narrow viewports before merging.
- Avoid fixed-width UI unless it is explicitly bounded with responsive constraints.

## Accessibility

- Interactive controls must have clear labels and keyboard-accessible behavior.
- Prefer semantic structure: headings, sections, buttons, labels, alerts.
- Maintain visible focus states.
- Do not ship low-contrast text for helper copy, overlays, or inactive states.

## Performance

- Browser-side ML, canvas, and simulation work should be isolated from presentational layout.
- Avoid unnecessary recomputation in render paths.
- Use dynamic imports or modular splits for heavy features when it improves startup cost.
- Cloudflare Pages is not a reason to keep giant files; modular client code is preferred.

## Data Fetching

- Reuse common polling and relative-time patterns instead of duplicating slightly different implementations.
- Handle loading, empty, success, and error states explicitly.
- Keep external API wiring separate from page shell layout where practical.

## Testing And Verification

- All substantial changes should leave the worktree passing `npm run lint` and `npm run build`.
- If a page has non-trivial state or transformations, prefer extracting pure logic so it becomes testable.
- Treat warnings as real cleanup work, not background noise.

## Refactoring Standard

- When touching a large page, improve structure as part of the change instead of adding new complexity on top.
- Prefer a sequence of safe extractions:
  - page shell
  - shared panel/header components
  - feature components
  - hooks
  - pure helpers
- Preserve behavior while reducing file size and responsibility per module.


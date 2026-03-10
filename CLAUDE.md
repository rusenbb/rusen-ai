# Project Practices

Use these practices for all future edits and new demos in this repository.

## Core Expectations

- Keep route files small and focused.
- Reuse shared UI primitives instead of copying layout and panel styles.
- Build every feature for light mode, dark mode, and mobile from the start.
- Keep heavy browser logic separate from page chrome and content layout.

## Page Structure

- Prefer shared page primitives from `src/components/ui/DemoLayout.tsx`.
- A good demo page should usually include:
  - clear title and description
  - one primary interactive surface
  - supporting explanation
  - loading/error handling

## Maintainability

- Split large pages into components, hooks, and helpers before they become hard to work in.
- Do not let `page.tsx` become the home for rendering code, polling code, simulation code, and control logic all at once.
- When touching large files, leave them smaller or cleaner than you found them.

## Design And UX

- Do not rely on dark-only contrast assumptions.
- Make overlays, helper text, and controls readable in both themes.
- Keep mobile controls comfortably tappable.
- If a demo has a custom visual world, make the contrast model explicit and intentional.

## Performance

- Cloudflare Pages does not require monolithic pages.
- Prefer modular code, and use dynamic loading when a feature is heavy enough to justify it.
- Keep render paths lean and move pure logic out of components where possible.

## Quality Bar

- Before considering work complete, verify:
  - `npm run lint`
  - `npm run build`
- Warnings should be treated as follow-up work, not ignored by default.


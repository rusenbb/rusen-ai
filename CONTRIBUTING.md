# Contributing to rusen.ai

Thank you for your interest in contributing to this portfolio project.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/rusenbb/rusen-ai.git
   cd rusen-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your OpenRouter API key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── app/demos/          # Interactive AI demos
├── components/ui/      # Shared UI components (Button, Alert, Spinner, etc.)
├── hooks/              # Shared React hooks (useAPI)
└── lib/                # Utilities and configuration
```

## Code Standards

- Use TypeScript with strict mode
- Follow existing code patterns
- Use shared UI components from `@/components/ui`
- Use shared hooks from `@/hooks`
- Add JSDoc comments to exported functions
- Run tests before submitting: `npm run test:run`

## Shared Components

The project uses a shared component library to ensure consistency:

| Component | Usage |
|-----------|-------|
| `<Button>` | All action buttons |
| `<Spinner>` | Loading indicators |
| `<Alert>` | Error/success/warning messages |
| `<Card>` | Content containers |

Import from `@/components/ui`:
```tsx
import { Button, Spinner, Alert } from "@/components/ui";
```

## Running Tests

```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

## Building

```bash
npm run build       # Production build
npm run lint        # ESLint check
```

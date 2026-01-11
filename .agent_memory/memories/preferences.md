# User Preferences

## Development Environment — 2025-01-11

**Package Manager**: Use `uv` (by astral-sh) for all Python operations:
- `uv run` - Run Python scripts
- `uv add` - Add dependencies
- `uv pip` - pip-like operations
- `uv venv` - Create virtual environments
- `uv sync` - Sync dependencies
- `uvx` - Run Python tools (e.g., `uvx ruff`)

**PyTorch with CUDA**: When installing PyTorch with CUDA support:
```bash
uv pip install "torch" --torch-backend=auto
```

**Node.js**: Standard npm is used for this Next.js project:
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run lint` - ESLint

## Interaction Style — 2025-01-11

**Clarification First**: For non-trivial tasks, reach ground truth understanding before coding:
1. Research the codebase
2. Ask targeted questions
3. Confirm understanding
4. Persist the plan
5. Execute autonomously

**Autonomy**: Only ask for help when:
- Scripts timeout (>20 minutes)
- `sudo` is needed
- Genuine blockers arise

**No Guessing**: Never guess numerical values - benchmark instead of estimating. Say "this needs to be measured" rather than inventing statistics.

## Commit Preferences — 2025-01-11

**Do NOT include** in commit messages:
- Co-authored-by lines for AI assistants
- Generated-with badges or links
- Emojis in commit messages

Keep commit messages clean and focused on the actual change.

## Validation Approach — 2025-01-11

**Small Scale First**: Always validate at small scale before scaling up. Run a sub-minute version first to verify the full pipeline works.

**First-Principles Reimplementation**: Building from scratch can beat adapting legacy code when:
- Implementations are in the wrong language
- Code carries historical baggage
- Architectural rewrites are needed

Process: Understand the domain at spec level → Choose optimal stack → Implement incrementally with human verification.

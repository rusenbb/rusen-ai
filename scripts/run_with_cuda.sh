#!/bin/bash
# Wrapper to set LD_LIBRARY_PATH for NVIDIA libs installed via pip.
# Usage:
#   ADAPTIVE_ARENA_DEVICE=cuda ./scripts/run_with_cuda.sh \
#     uv run python scripts/train_adaptive_arena.py

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NVIDIA_LIBS=$(find "$SCRIPT_DIR/.venv/lib" -path "*/site-packages/nvidia/*/lib" -type d 2>/dev/null | tr '\n' ':')
export LD_LIBRARY_PATH="${NVIDIA_LIBS}${LD_LIBRARY_PATH:-}"

exec "$@"

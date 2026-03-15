#!/bin/bash
# Wrapper to set LD_LIBRARY_PATH for NVIDIA libs installed via pip.
# Usage: ./scripts/run_with_cuda.sh uv run scripts/generate_temperature_trees.py

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_PACKAGES="$SCRIPT_DIR/.venv/lib/python3.12/site-packages"

NVIDIA_LIBS=$(find "$SITE_PACKAGES/nvidia" -name "lib" -type d 2>/dev/null | tr '\n' ':')
export LD_LIBRARY_PATH="${NVIDIA_LIBS}${LD_LIBRARY_PATH}"

exec "$@"

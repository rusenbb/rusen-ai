# /// script
# requires-python = ">=3.12"
# dependencies = ["jinja2>=3.1"]
# ///
"""
Render src/content/cv.json into LaTeX (via Jinja2) and compile to PDF (via tectonic).

Outputs:
  public/cv.tex   — generated LaTeX source (committed)
  public/cv.pdf   — compiled PDF (committed)

Single source of truth lives in src/content/cv.json. Run this whenever the JSON
changes; commit both outputs alongside.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import jinja2

ROOT = Path(__file__).resolve().parent.parent
CV_JSON = ROOT / "src" / "content" / "cv.json"
TEMPLATE_DIR = ROOT / "scripts" / "cv-template"
TEMPLATE_NAME = "cv.tex.j2"
PUBLIC_DIR = ROOT / "public"
OUT_TEX = PUBLIC_DIR / "cv.tex"
OUT_PDF = PUBLIC_DIR / "cv.pdf"


# Order matters: backslash must be escaped first so its replacement isn't
# re-escaped by later rules.
_LATEX_ESCAPES = [
    ("\\", r"\textbackslash{}"),
    ("&", r"\&"),
    ("%", r"\%"),
    ("$", r"\$"),
    ("#", r"\#"),
    ("_", r"\_"),
    ("{", r"\{"),
    ("}", r"\}"),
    ("~", r"\textasciitilde{}"),
    ("^", r"\textasciicircum{}"),
    ("<", r"\textless{}"),
    (">", r"\textgreater{}"),
]


def latex_escape(value: object) -> str:
    """Escape a string for safe inclusion in a LaTeX document body."""
    text = "" if value is None else str(value)
    for char, replacement in _LATEX_ESCAPES:
        text = text.replace(char, replacement)
    return text


def latex_bullets(items: list) -> str:
    """Escape each item and join with a LaTeX bullet separator."""
    return r" \textbullet{} ".join(latex_escape(item) for item in items)


def build_environment() -> jinja2.Environment:
    """Jinja2 env with LaTeX-friendly delimiters so we don't fight `{ }`."""
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
        block_start_string=r"\BLOCK{",
        block_end_string="}",
        variable_start_string=r"\VAR{",
        variable_end_string="}",
        comment_start_string=r"\#{",
        comment_end_string="}",
        trim_blocks=True,
        lstrip_blocks=True,
        autoescape=False,
        keep_trailing_newline=True,
    )
    env.filters["latex"] = latex_escape
    env.filters["latex_bullets"] = latex_bullets
    env.filters["upper"] = lambda s: str(s).upper()
    return env


def render() -> str:
    cv_data = json.loads(CV_JSON.read_text(encoding="utf-8"))
    env = build_environment()
    template = env.get_template(TEMPLATE_NAME)
    return template.render(cv=cv_data)


def compile_pdf(tex_source: str) -> bytes:
    """Run tectonic on the rendered LaTeX, returning the PDF bytes."""
    if shutil.which("tectonic") is None:
        sys.exit(
            "tectonic not found on PATH. Install from "
            "https://tectonic-typesetting.github.io/en-US/install.html"
        )

    with tempfile.TemporaryDirectory(prefix="cv-build-") as build_dir:
        build = Path(build_dir)
        tex_path = build / "cv.tex"
        tex_path.write_text(tex_source, encoding="utf-8")

        result = subprocess.run(
            [
                "tectonic",
                "--keep-logs",
                "--outdir",
                str(build),
                str(tex_path),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            sys.stderr.write(result.stdout)
            sys.stderr.write(result.stderr)
            log = build / "cv.log"
            if log.exists():
                sys.stderr.write("\n--- cv.log tail ---\n")
                sys.stderr.write("\n".join(log.read_text().splitlines()[-40:]))
            sys.exit(f"tectonic failed (exit {result.returncode})")

        pdf_path = build / "cv.pdf"
        return pdf_path.read_bytes()


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    print(f"reading  {CV_JSON.relative_to(ROOT)}")
    tex_source = render()

    print(f"compiling via tectonic …")
    pdf_bytes = compile_pdf(tex_source)

    OUT_TEX.write_text(tex_source, encoding="utf-8")
    OUT_PDF.write_bytes(pdf_bytes)
    print(f"wrote    {OUT_TEX.relative_to(ROOT)} ({len(tex_source):,} bytes)")
    print(f"wrote    {OUT_PDF.relative_to(ROOT)} ({len(pdf_bytes):,} bytes)")


if __name__ == "__main__":
    main()

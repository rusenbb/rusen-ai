# /// script
# requires-python = ">=3.12"
# dependencies = ["jinja2>=3.1"]
# ///
"""
Render src/content/cv.json into LaTeX (via Jinja2) and compile to PDF (via tectonic).

Outputs:
  public/cv.tex   : generated LaTeX source (committed)
  public/cv.pdf   : compiled PDF (committed)

Single source of truth lives in src/content/cv.json. Run this whenever the JSON
changes; commit both outputs alongside.

CLI flags (PDF-only — not reflected in the public HTML CV):
  --phone PHONE                  Inject a phone number. Intentionally not in
                                 cv.json so the public web CV doesn't expose
                                 it; passed in here for specific recipients.
  --personal-email EMAIL         Inject an additional contact email line.
  --locale {en,tr,all}           Pick a locale for content + output filename.
                                 Default 'all' renders both en and tr.

NOTE: Japanese (ja) lives at /cv/ja as HTML only. Adding a JA PDF requires a
CJK-aware LaTeX setup (xeCJK + Noto CJK fonts in the build environment) which
is intentionally out of scope here.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import jinja2

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "src" / "content"
TEMPLATE_DIR = ROOT / "scripts" / "cv-template"
TEMPLATE_NAME = "cv.tex.j2"
PUBLIC_DIR = ROOT / "public"

SUPPORTED_LOCALES = ("en", "tr")

# LaTeX-side locale labels. Mirrors src/lib/cv.ts CVLabels but only the
# parts the LaTeX template references — section names, contact-bar
# abbreviations, and a couple of inline labels (GPA, summary).
LABELS: dict[str, dict[str, str]] = {
    "en": {
        "summary": "Summary",
        "experience": "Experience",
        "projects": "Projects",
        "education": "Education",
        "awards": "Awards",
        "courses": "Courses",
        "skills": "Skills",
        "languages": "Languages",
        "interests": "Interests",
        "gpa": "GPA",
        "dobAbbr": "DOB",
        "licAbbr": "LICENSE",
        "statusAbbr": "STATUS",
    },
    "tr": {
        "summary": "Özet",
        "experience": "Deneyim",
        "projects": "Projeler",
        "education": "Eğitim",
        "awards": "Ödüller",
        "courses": "Kurslar",
        "skills": "Yetenekler",
        "languages": "Diller",
        "interests": "İlgi Alanları",
        "gpa": "ORT",
        "dobAbbr": "DOĞ",
        "licAbbr": "EHLİYET",
        "statusAbbr": "DURUM",
    },
}


def cv_paths(locale: str) -> tuple[Path, Path, Path]:
    """Return (json_input, tex_output, pdf_output) paths for a locale."""
    if locale == "en":
        return (CONTENT_DIR / "cv.json", PUBLIC_DIR / "cv.tex", PUBLIC_DIR / "cv.pdf")
    return (
        CONTENT_DIR / f"cv.{locale}.json",
        PUBLIC_DIR / f"cv.{locale}.tex",
        PUBLIC_DIR / f"cv.{locale}.pdf",
    )


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


def _upper_default(value: object) -> str:
    return str(value).upper()


def _upper_turkish(value: object) -> str:
    r"""Turkish-aware uppercase. The standard `str.upper()` maps `i` -> `I`,
    losing the dot. Turkish needs `i` -> `İ` and `ı` -> `I`. We swap those
    pairs first, then defer to `upper()` for the rest of the alphabet.

    This matters because `\MakeUppercase` in LaTeX has the same defect, so
    uppercasing in Python (with this function) and skipping LaTeX's macro
    is the cleanest way to get correct DENEYİM / EĞİTİM / DİLLER /
    İLGİ ALANLARI in a Turkish CV.
    """
    return str(value).replace("i", "İ").replace("ı", "I").upper()


_UPPER_FILTERS: dict[str, callable] = {
    "tr": _upper_turkish,
}


def build_environment(locale: str) -> jinja2.Environment:
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
    env.filters["upper"] = _UPPER_FILTERS.get(locale, _upper_default)
    return env


def render(
    json_path: Path,
    *,
    locale: str,
    phone_override: str | None = None,
    personal_email: str | None = None,
) -> str:
    cv_data = json.loads(json_path.read_text(encoding="utf-8"))
    if phone_override:
        cv_data["basics"]["phone"] = phone_override
    env = build_environment(locale)
    template = env.get_template(TEMPLATE_NAME)
    return template.render(
        cv=cv_data,
        labels=LABELS[locale],
        personal_email=personal_email,
    )


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render the CV from JSON to LaTeX and PDF.",
    )
    parser.add_argument(
        "--phone",
        help="Inject a phone number into the rendered PDF only.",
    )
    parser.add_argument(
        "--personal-email",
        dest="personal_email",
        help="Inject an additional contact email into the rendered PDF only.",
    )
    parser.add_argument(
        "--locale",
        choices=("all", *SUPPORTED_LOCALES),
        default="all",
        help="Locale to render. 'all' (default) builds every supported locale.",
    )
    return parser.parse_args()


def build_for_locale(
    locale: str,
    *,
    phone_override: str | None,
    personal_email: str | None,
) -> None:
    json_path, tex_out, pdf_out = cv_paths(locale)
    if not json_path.exists():
        sys.exit(f"missing input: {json_path.relative_to(ROOT)}")

    print(f"[{locale}] reading  {json_path.relative_to(ROOT)}")
    tex_source = render(
        json_path,
        locale=locale,
        phone_override=phone_override,
        personal_email=personal_email,
    )

    print(f"[{locale}] compiling via tectonic")
    pdf_bytes = compile_pdf(tex_source)

    tex_out.write_text(tex_source, encoding="utf-8")
    pdf_out.write_bytes(pdf_bytes)
    print(f"[{locale}] wrote    {tex_out.relative_to(ROOT)} ({len(tex_source):,} bytes)")
    print(f"[{locale}] wrote    {pdf_out.relative_to(ROOT)} ({len(pdf_bytes):,} bytes)")


def main() -> None:
    args = parse_args()
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    locales = SUPPORTED_LOCALES if args.locale == "all" else (args.locale,)
    for locale in locales:
        build_for_locale(
            locale,
            phone_override=args.phone,
            personal_email=args.personal_email,
        )


if __name__ == "__main__":
    main()

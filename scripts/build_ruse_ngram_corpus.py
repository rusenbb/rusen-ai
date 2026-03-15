"""Build split, provenance-rich corpora for RuseN-Gram and Rusenizer v2.

This script only uses externally sourced datasets. It writes structured JSONL
files with deterministic train/validation/test splits so both the tokenizer and
the statistical language models can be trained and evaluated honestly.

Usage:
    uv run python scripts/build_ruse_ngram_corpus.py
"""

from __future__ import annotations

import hashlib
import html
import json
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from datasets import load_dataset


ROOT = Path(__file__).parent.parent
OUTPUT_DIR = ROOT / "src" / "content" / "rusen-gram"
BASE_OUTPUT = OUTPUT_DIR / "base-corpus.tr.jsonl"
ASSISTANT_OUTPUT = OUTPUT_DIR / "assistant-corpus.tr.jsonl"
MANIFEST_OUTPUT = OUTPUT_DIR / "corpus-manifest.json"

WIKIPEDIA_CONFIG = "20231101.tr"
MAX_WIKIPEDIA_DOCS = 1600
MAX_WIKIPEDIA_CHARS = 700
MAX_ASSISTANT_DOCS = 1100
ASSISTANT_SOURCE_LIMITS = {
    "sixfingerdev/turkish-qa-multi-dialog-dataset": 420,
    "bezir/turkish_exam_instructions": 360,
    "atasoglu/instruction-turkish": 320,
}
MIN_TEXT_CHARS = 48

WS_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class CorpusRecord:
    id: str
    source: str
    domain: str
    split: str
    text: str
    prompt: str | None = None
    completion: str | None = None


def normalize_text(text: str) -> str:
    text = html.unescape(text)
    text = text.replace("\u00a0", " ")
    text = WS_RE.sub(" ", text).strip()
    return text


def split_for_key(key: str) -> str:
    bucket = int(hashlib.sha1(key.encode("utf-8")).hexdigest()[:8], 16) % 100
    if bucket < 80:
        return "train"
    if bucket < 90:
        return "validation"
    return "test"


def sentence_chunks(text: str, max_chars: int) -> list[str]:
    normalized = normalize_text(text)
    if len(normalized) < MIN_TEXT_CHARS:
        return []

    sentences = re.split(r"(?<=[.!?])\s+", normalized)
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        if not sentence:
            continue
        candidate = sentence if not current else f"{current} {sentence}"
        if len(candidate) > max_chars and current:
            if len(current) >= MIN_TEXT_CHARS:
                chunks.append(current)
            current = sentence
        else:
            current = candidate

    if len(current) >= MIN_TEXT_CHARS:
        chunks.append(current)

    return chunks


def iter_base_records() -> Iterable[CorpusRecord]:
    dataset = load_dataset(
        "wikimedia/wikipedia",
        WIKIPEDIA_CONFIG,
        split="train",
        streaming=True,
    )

    seen: set[str] = set()
    emitted = 0

    for row in dataset:
        text = row.get("text")
        title = normalize_text(str(row.get("title", "")))
        if not isinstance(text, str):
            continue

        for chunk in sentence_chunks(text, MAX_WIKIPEDIA_CHARS):
            dedupe_key = normalize_text(chunk).casefold()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            suffix = hashlib.sha1(f"{title}|{dedupe_key}".encode("utf-8")).hexdigest()[:12]
            yield CorpusRecord(
                id=f"base:wikipedia:{suffix}",
                source="wikimedia/wikipedia",
                domain="base",
                split=split_for_key(f"wiki:{suffix}"),
                text=chunk,
            )
            emitted += 1
            if emitted >= MAX_WIKIPEDIA_DOCS:
                return


def assistant_record(
    source: str,
    prompt: str,
    completion: str,
) -> CorpusRecord | None:
    prompt = normalize_text(prompt)
    completion = normalize_text(completion)
    if len(prompt) < MIN_TEXT_CHARS or len(completion) < MIN_TEXT_CHARS:
        return None

    key = normalize_text(f"{prompt}\n{completion}").casefold()
    suffix = hashlib.sha1(f"{source}|{key}".encode("utf-8")).hexdigest()[:12]
    return CorpusRecord(
        id=f"assistant:{suffix}",
        source=source,
        domain="assistant",
        split=split_for_key(f"assistant:{suffix}"),
        text=f"Kullanıcı: {prompt}\nAsistan: {completion}",
        prompt=prompt,
        completion=completion,
    )


def iter_assistant_records() -> Iterable[CorpusRecord]:
    seen: set[str] = set()
    emitted = 0
    per_source: Counter[str] = Counter()

    datasets_to_stream = [
        (
            "sixfingerdev/turkish-qa-multi-dialog-dataset",
            dict(split="train", streaming=True),
            lambda row: (str(row.get("input", "")), str(row.get("output", ""))),
        ),
        (
            "bezir/turkish_exam_instructions",
            dict(split="train", streaming=True),
            lambda row: (str(row.get("soru", "")), str(row.get("cevap", ""))),
        ),
        (
            "atasoglu/instruction-turkish",
            dict(split="test", streaming=True),
            lambda row: (
                str(row.get("prompt_turkish", "")),
                str(row.get("completion_turkish", "")),
            ),
        ),
    ]

    for source, kwargs, extractor in datasets_to_stream:
        limit = ASSISTANT_SOURCE_LIMITS[source]
        stream = load_dataset(source, **kwargs)
        for row in stream:
            if per_source[source] >= limit or emitted >= MAX_ASSISTANT_DOCS:
                break
            prompt, completion = extractor(row)
            record = assistant_record(source, prompt, completion)
            if record is None:
                continue
            dedupe_key = normalize_text(f"{record.prompt}\n{record.completion}").casefold()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            per_source[source] += 1
            emitted += 1
            yield record
        if emitted >= MAX_ASSISTANT_DOCS:
            return


def write_jsonl(path: Path, records: list[CorpusRecord]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")


def write_manifest(path: Path, base_records: list[CorpusRecord], assistant_records: list[CorpusRecord]) -> None:
    by_source: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    by_domain_split: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for record in [*base_records, *assistant_records]:
        by_source[record.source][record.split] += 1
        by_domain_split[record.domain][record.split] += 1

    manifest = {
        "basePath": str(BASE_OUTPUT.relative_to(ROOT)),
        "assistantPath": str(ASSISTANT_OUTPUT.relative_to(ROOT)),
        "counts": {
            "base": len(base_records),
            "assistant": len(assistant_records),
        },
        "bySource": {source: dict(counts) for source, counts in sorted(by_source.items())},
        "byDomainSplit": {
            domain: dict(counts) for domain, counts in sorted(by_domain_split.items())
        },
    }
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    base_records = list(iter_base_records())
    assistant_records = list(iter_assistant_records())

    write_jsonl(BASE_OUTPUT, base_records)
    write_jsonl(ASSISTANT_OUTPUT, assistant_records)
    write_manifest(MANIFEST_OUTPUT, base_records, assistant_records)

    print(f"Wrote {len(base_records)} base records to {BASE_OUTPUT}")
    print(f"Wrote {len(assistant_records)} assistant records to {ASSISTANT_OUTPUT}")
    print(f"Wrote corpus manifest to {MANIFEST_OUTPUT}")


if __name__ == "__main__":
    main()

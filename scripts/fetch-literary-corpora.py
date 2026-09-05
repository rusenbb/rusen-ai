"""Fetch the 12 selected Gutenberg editions with provenance; standard library only.

Original files (including their Gutenberg licenses) are served unchanged.
The browser extracts text between the Gutenberg START/END markers for training.
"""

import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

CORPORA = [
    (
        11,
        "alice",
        "Alice’s Adventures in Wonderland",
        "Lewis Carroll",
        "Fiction",
        "alice was",
    ),
    (
        1661,
        "sherlock",
        "The Adventures of Sherlock Holmes",
        "Arthur Conan Doyle",
        "Fiction",
        "sherlock holmes",
    ),
    (1342, "pride", "Pride and Prejudice", "Jane Austen", "Fiction", "elizabeth was"),
    (84, "frankenstein", "Frankenstein", "Mary Shelley", "Fiction", "i felt"),
    (
        35,
        "time-machine",
        "The Time Machine",
        "H. G. Wells",
        "Fiction",
        "the time traveller",
    ),
    (345, "dracula", "Dracula", "Bram Stoker", "Fiction", "the count"),
    (
        1041,
        "sonnets",
        "Shakespeare’s Sonnets",
        "William Shakespeare",
        "Poetry",
        "thou art",
    ),
    (
        12242,
        "dickinson",
        "Poems — Three Series, Complete",
        "Emily Dickinson",
        "Poetry",
        "i could",
    ),
    (574, "blake", "Poems of William Blake", "William Blake", "Poetry", "the little"),
    (1322, "whitman", "Leaves of Grass", "Walt Whitman", "Poetry", "i hear"),
    (12843, "emerson", "Poems", "Ralph Waldo Emerson", "Poetry", "the world"),
    (
        25609,
        "stevenson",
        "A Child’s Garden of Verses",
        "Robert Louis Stevenson",
        "Poetry",
        "when i was",
    ),
]
# Boundaries inspected in these editions; omit publisher/editor matter.
SECTIONS = {
    "alice": [{"start": "CHAPTER I.\nDown the Rabbit-Hole", "end": "\nTHE END"}],
    "sherlock": [{"start": "I. A SCANDAL IN BOHEMIA", "end": ""}],
    "pride": [
        {
            "start": "It is a truth universally acknowledged,",
            "end": "\n                            [Illustration:\n\n                                  THE",
        }
    ],
    "frankenstein": [{"start": "Letter 1\n\n_To Mrs. Saville, England._", "end": ""}],
    "dracula": [
        {
            "start": "CHAPTER I\n\nJONATHAN HARKER’S JOURNAL",
            "end": "\n                                THE END",
        }
    ],
    "time-machine": [
        {
            "start": "The Time Traveller (for so it will be convenient to speak of him)",
            "end": "",
        }
    ],
    "sonnets": [
        {"start": "I\n\nFrom fairest creatures we desire increase,", "end": ""}
    ],
    "blake": [{"start": "Piping down the valleys wild,", "end": ""}],
    "whitman": [{"start": "Come, said my soul,", "end": ""}],
    "emerson": [
        {
            "start": "GOOD-BYE\n\nGood-bye, proud world! I'm going home:",
            "end": "\nINDEX OF FIRST LINES",
        }
    ],
    "stevenson": [{"start": "\nBED IN SUMMER\n", "end": ""}],
    "dickinson": [
        {
            "start": "This is my letter to the world,",
            "end": "\nPOEMS\n\nby EMILY DICKINSON",
        },
        {"start": "I'm nobody!  Who are you?", "end": "\nPOEMS\n\nby EMILY DICKINSON"},
        {"start": "'T is little I could care for pearls", "end": ""},
    ],
}
ROOT = Path(__file__).resolve().parents[1]


def fetch(
    row: tuple[int, str, str, str, str, str],
) -> dict[str, str | int | list[dict[str, str]]]:
    number, slug, title, author, kind, prompt = row
    url = f"https://www.gutenberg.org/cache/epub/{number}/pg{number}.txt"
    path = ROOT / "public" / "corpora" / f"{slug}.txt"
    if not path.exists():
        with urllib.request.urlopen(url, timeout=90) as response:
            data = response.read()
        if b"*** START OF" not in data or b"*** END OF" not in data:
            raise ValueError(f"Missing Gutenberg text markers: {url}")
        path.write_bytes(data)
    data = path.read_bytes()
    print(f"{slug}: {len(data):,} bytes", flush=True)
    return {
        "id": slug,
        "title": title,
        "author": author,
        "kind": kind,
        "prompt": prompt,
        "path": f"/corpora/{slug}.txt",
        "bytes": len(data),
        "source": f"https://www.gutenberg.org/ebooks/{number}",
        "download": url,
        "sha256": hashlib.sha256(data).hexdigest(),
        "sections": SECTIONS[slug],
        "rights": "Public domain in the USA — Project Gutenberg edition",
    }


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        catalog = list(pool.map(fetch, CORPORA))
    (ROOT / "src/content/literary-corpora.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n"
    )

"""
Post-process generated temperature trees for the frontend.

Reads the full temperature-trees.json (with top-100 logprobs),
trims to top-10, splits into individual per-prompt JSON files,
creates an index manifest, and builds a token vocabulary lookup
from the tokenizer for all token IDs that appear in the data.

Usage:
    ./scripts/run_with_cuda.sh uv run scripts/ship_temperature_data.py

Input:
    generated/temperature-playground/temperature-trees.json

Output:
    public/temperature-playground/data/index.json
    public/temperature-playground/data/vocab.json
    public/temperature-playground/data/<category>-<level>.json  (x27)
"""

import json
from pathlib import Path

from transformers import AutoTokenizer

MODEL_ID = "Qwen/Qwen3-4B-Instruct-2507"
TOP_K_SHIP = 10
INPUT = Path(__file__).parent.parent / "generated" / "temperature-playground" / "temperature-trees.json"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "temperature-playground" / "data"


def slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("'", "")


def collect_token_ids(all_data: list[dict]) -> set[int]:
    """Collect every token ID that appears anywhere in the data."""
    ids: set[int] = set()
    for prompt_data in all_data:
        for pt in prompt_data.get("prefillTokens", []):
            ids.add(pt["id"])
        for temp_key in prompt_data["trees"]:
            for branch in prompt_data["trees"][temp_key]:
                for token in branch["tokens"]:
                    ids.add(token["id"])
                    for alt in token["logprobs"]:
                        # logprobs are stored as [id, text, logprob] tuples
                        ids.add(alt[0])
    return ids


def build_vocab(token_ids: set[int], tokenizer) -> dict[str, str]:
    """Map each token ID to its raw BPE token string.

    The raw token (from convert_ids_to_tokens) preserves the BPE
    representation — e.g. 'Ġhello' for ' hello', 'Ċ' for '\\n',
    byte tokens like 'Į' for raw byte 0xEA, etc.
    """
    vocab: dict[str, str] = {}
    for tid in sorted(token_ids):
        raw = tokenizer.convert_ids_to_tokens(tid)
        if raw is not None:
            vocab[str(tid)] = raw
    return vocab


def pick_branch_alternative(token: dict) -> tuple[int, str] | None:
    """Pick the best non-sampled alternative from a token's logprobs."""
    sampled_id = token["id"]

    for alt in token["logprobs"]:
        if isinstance(alt, list):
            alt_id, alt_text = alt[0], alt[1]
        else:
            alt_id, alt_text = alt.get("id"), alt.get("text")

        if alt_id != sampled_id:
            return alt_id, alt_text

    return None


def main():
    if not INPUT.exists():
        print(f"Error: {INPUT} not found. Run generate_temperature_trees.py first.")
        return

    with open(INPUT) as f:
        all_data = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Collect all token IDs before trimming
    all_ids = collect_token_ids(all_data)
    print(f"Found {len(all_ids)} unique token IDs across all data")

    # The system prompts keyed by (category, level). These match the
    # PROMPTS list in generate_temperature_trees.py. If the generation
    # script already included the system field, this is a no-op.
    SYSTEM_PROMPTS: dict[tuple[str, str], str] = {
        ("Code", "deterministic"): "",
        ("Code", "medium"): "",
        ("Code", "creative"): "",
        ("Story", "deterministic"): "Write the opening line of a mystery novel.",
        ("Story", "medium"): "Write the opening line of a story.",
        ("Story", "creative"): "Write a story.",
        ("Poetry", "deterministic"): "Write a haiku about winter.",
        ("Poetry", "medium"): "Finish this poem: Roses are red,",
        ("Poetry", "creative"): "Write a poem.",
        ("Science", "deterministic"): "What is the speed of light?",
        ("Science", "medium"): "Explain why the sky is blue.",
        ("Science", "creative"): "Tell me something interesting about physics.",
        ("History", "deterministic"): "When did World War II end?",
        ("History", "medium"): "Name a turning point in the 1960s.",
        ("History", "creative"): "Tell me about an overlooked historical event.",
        ("Cooking", "deterministic"): "How do you boil an egg?",
        ("Cooking", "medium"): "Give me a pasta recipe.",
        ("Cooking", "creative"): "Invent a new dish.",
        ("Advice", "deterministic"): "How do I tie a tie?",
        ("Advice", "medium"): "How should I prepare for a job interview?",
        ("Advice", "creative"): "What should I do with my life?",
        ("Dialogue", "deterministic"): "Respond to: What time is it?",
        ("Dialogue", "medium"): "Respond to: How was your day?",
        ("Dialogue", "creative"): "Respond to: What do you think about love?",
        ("Lists", "deterministic"): "List the planets in order.",
        ("Lists", "medium"): "List fun weekend activities.",
        ("Lists", "creative"): "List things that don't exist but should.",
    }

    manifest = []
    total_raw = 0
    total_trimmed = 0

    for prompt_data in all_data:
        # Inject system prompt if not already present
        if "system" not in prompt_data:
            key = (prompt_data["category"], prompt_data["level"])
            prompt_data["system"] = SYSTEM_PROMPTS.get(key, "")
        category = prompt_data["category"]
        level = prompt_data["level"]
        file_name = f"{slugify(category)}-{level}.json"

        # Trim logprobs and backfill fork token info from parent logprobs
        for temp_key in prompt_data["trees"]:
            branches = prompt_data["trees"][temp_key]
            branch_by_id = {b["id"]: b for b in branches}

            for branch in branches:
                for token in branch["tokens"]:
                    total_raw += len(token["logprobs"])
                    token["logprobs"] = token["logprobs"][:TOP_K_SHIP]
                    total_trimmed += len(token["logprobs"])

                # Backfill forkTokenId/forkTokenText if not present
                # (for data generated before the script stored them).
                # Pick the best non-sampled alternative from the parent token.
                if (
                    branch["parentId"] is not None
                    and "forkTokenId" not in branch
                ):
                    parent = branch_by_id.get(branch["parentId"])
                    if parent:
                        fork_idx = branch["forkIndex"]
                        if fork_idx < len(parent["tokens"]):
                            parent_token = parent["tokens"][fork_idx]
                            alternative = pick_branch_alternative(parent_token)
                            if alternative is not None:
                                branch["forkTokenId"], branch["forkTokenText"] = alternative

        # Write per-prompt file
        out_path = OUTPUT_DIR / file_name
        with open(out_path, "w") as f:
            json.dump(prompt_data, f, ensure_ascii=False, separators=(",", ":"))

        size_kb = out_path.stat().st_size / 1024
        manifest.append({
            "category": category,
            "level": level,
            "label": prompt_data["label"],
            "file": file_name,
        })
        print(f"  {file_name} ({size_kb:.1f} KB)")

    # Write manifest
    manifest_path = OUTPUT_DIR / "index.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Build and write vocab lookup
    print(f"\nBuilding vocab from {MODEL_ID}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    vocab = build_vocab(all_ids, tokenizer)
    vocab_path = OUTPUT_DIR / "vocab.json"
    with open(vocab_path, "w") as f:
        json.dump(vocab, f, ensure_ascii=False, separators=(",", ":"))
    vocab_kb = vocab_path.stat().st_size / 1024
    print(f"  vocab.json ({vocab_kb:.1f} KB, {len(vocab)} entries)")

    total_size = sum(f.stat().st_size for f in OUTPUT_DIR.glob("*.json"))
    print(f"\nDone! {len(manifest) + 2} files, {total_size / 1024:.0f} KB total")
    print(f"Logprobs trimmed: {total_raw} → {total_trimmed} entries")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

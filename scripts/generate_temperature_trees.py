"""
Generate pre-computed temperature trees for the Temperature Playground.

Runs Qwen3.5-4B via mlx-lm, generates branching trees at 3 temperatures
for 27 prompts (9 categories x 3 determinism levels), stores log-probs
so the client can compute softmax at any temperature.

Usage:
    uv run scripts/generate_temperature_trees.py

Output:
    public/data/temperature-trees.json
"""

import json
import math
import time
from pathlib import Path
from dataclasses import dataclass, field

import mlx.core as mx
from mlx_lm import load
from mlx_lm.generate import generate_step
from mlx_lm.sample_utils import make_sampler

MODEL_ID = "mlx-community/Qwen3.5-4B-MLX-4bit"
TEMPERATURES = [0.0, 0.7, 1.5]
TOP_K_STORE = 100
MAX_TOKENS = 50
BRANCH_THRESHOLD = 0.10  # branch when runner-up prob > 10%
MAX_BRANCHES = 12

# fmt: off
PROMPTS = [
    # Category 1: Code
    {"category": "Code", "level": "deterministic", "system": "", "prefill": "def fibonacci(n):\n    ", "label": "def fibonacci(n):"},
    {"category": "Code", "level": "medium", "system": "", "prefill": "class User:\n    ", "label": "class User:"},
    {"category": "Code", "level": "creative", "system": "", "prefill": "def create_", "label": "def create_"},

    # Category 2: Story
    {"category": "Story", "level": "deterministic", "system": "Write the opening line of a mystery novel.", "prefill": "The body was found ", "label": "Opening of a mystery novel"},
    {"category": "Story", "level": "medium", "system": "Write the opening line of a story.", "prefill": "She opened the door and ", "label": "Opening of a story"},
    {"category": "Story", "level": "creative", "system": "Write a story.", "prefill": "It ", "label": "Write a story"},

    # Category 3: Poetry
    {"category": "Poetry", "level": "deterministic", "system": "Write a haiku about winter.", "prefill": "Silent snowflakes fall\n", "label": "Haiku about winter"},
    {"category": "Poetry", "level": "medium", "system": "Finish this poem: Roses are red,", "prefill": "Violets are blue,\n", "label": "Roses are red..."},
    {"category": "Poetry", "level": "creative", "system": "Write a poem.", "prefill": "The ", "label": "Write a poem"},

    # Category 4: Science
    {"category": "Science", "level": "deterministic", "system": "What is the speed of light?", "prefill": "The speed of light is ", "label": "Speed of light"},
    {"category": "Science", "level": "medium", "system": "Explain why the sky is blue.", "prefill": "The sky appears blue because ", "label": "Why is the sky blue?"},
    {"category": "Science", "level": "creative", "system": "Tell me something interesting about physics.", "prefill": "One fascinating thing is ", "label": "Interesting physics fact"},

    # Category 5: History
    {"category": "History", "level": "deterministic", "system": "When did World War II end?", "prefill": "World War II ended in ", "label": "When did WW2 end?"},
    {"category": "History", "level": "medium", "system": "Name a turning point in the 1960s.", "prefill": "One major turning point was ", "label": "1960s turning point"},
    {"category": "History", "level": "creative", "system": "Tell me about an overlooked historical event.", "prefill": "Few people know that ", "label": "Overlooked historical event"},

    # Category 6: Cooking
    {"category": "Cooking", "level": "deterministic", "system": "How do you boil an egg?", "prefill": "To boil an egg, first ", "label": "How to boil an egg"},
    {"category": "Cooking", "level": "medium", "system": "Give me a pasta recipe.", "prefill": "Here's a simple recipe:\n", "label": "Pasta recipe"},
    {"category": "Cooking", "level": "creative", "system": "Invent a new dish.", "prefill": "Imagine a dish where ", "label": "Invent a new dish"},

    # Category 7: Advice
    {"category": "Advice", "level": "deterministic", "system": "How do I tie a tie?", "prefill": "Step 1: ", "label": "How to tie a tie"},
    {"category": "Advice", "level": "medium", "system": "How should I prepare for a job interview?", "prefill": "The most important thing is ", "label": "Job interview prep"},
    {"category": "Advice", "level": "creative", "system": "What should I do with my life?", "prefill": "That's a ", "label": "What to do with my life?"},

    # Category 8: Dialogue
    {"category": "Dialogue", "level": "deterministic", "system": "Respond to: What time is it?", "prefill": "It's ", "label": "What time is it?"},
    {"category": "Dialogue", "level": "medium", "system": "Respond to: How was your day?", "prefill": "It was ", "label": "How was your day?"},
    {"category": "Dialogue", "level": "creative", "system": "Respond to: What do you think about love?", "prefill": "I think ", "label": "What do you think about love?"},

    # Category 9: Lists
    {"category": "Lists", "level": "deterministic", "system": "List the planets in order.", "prefill": "1. Mercury\n2. ", "label": "Planets in order"},
    {"category": "Lists", "level": "medium", "system": "List fun weekend activities.", "prefill": "1. ", "label": "Fun weekend activities"},
    {"category": "Lists", "level": "creative", "system": "List things that don't exist but should.", "prefill": "1. ", "label": "Things that should exist"},
]
# fmt: on


@dataclass
class TokenData:
    token_id: int
    token_text: str
    top_logprobs: list[tuple[int, str, float]]  # (id, text, logprob)


@dataclass
class Branch:
    id: int
    parent_id: int | None
    fork_token_index: int
    tokens: list[TokenData] = field(default_factory=list)


# Global vocab cache: token_id -> decoded text
_vocab_cache: dict[int, str] = {}


def get_token_text(tokenizer, token_id: int) -> str:
    """Cached token decode."""
    if token_id not in _vocab_cache:
        _vocab_cache[token_id] = tokenizer.decode([token_id])
    return _vocab_cache[token_id]


def logprobs_to_probs(logprobs: list[float], temperature: float) -> list[float]:
    """Convert log-probs (at T=1) to probs at a given temperature.

    log-probs are logits - logsumexp(logits), which is equivalent to
    log(softmax(logits)). To apply temperature T, we need:
      softmax(logits / T) = softmax((logprob + C) / T)
    Since softmax is shift-invariant, we can just do softmax(logprob / T).
    """
    if temperature == 0:
        max_idx = max(range(len(logprobs)), key=lambda i: logprobs[i])
        return [1.0 if i == max_idx else 0.0 for i in range(len(logprobs))]

    scaled = [lp / temperature for lp in logprobs]
    max_val = max(scaled)
    exps = [math.exp(s - max_val) for s in scaled]
    total = sum(exps)
    return [e / total for e in exps]


def build_prompt_ids(tokenizer, prompt_config: dict) -> list[int]:
    """Build prompt token IDs manually to avoid chat template closing tags.

    For chat prompts, constructs:
        <|im_start|>user\n{instruction}<|im_end|>\n
        <|im_start|>assistant\n{prefill}
    No thinking block, no closing <|im_end|>, so generation continues.
    """
    if not prompt_config["system"]:
        return tokenizer.encode(prompt_config["prefill"], add_special_tokens=False)

    # Build manually to avoid <think></think> and trailing <|im_end|>
    im_start = tokenizer.convert_tokens_to_ids("<|im_start|>")
    im_end = tokenizer.convert_tokens_to_ids("<|im_end|>")
    nl = tokenizer.encode("\n", add_special_tokens=False)

    user_text_ids = tokenizer.encode(
        prompt_config["system"], add_special_tokens=False
    )
    prefill_ids = tokenizer.encode(
        prompt_config["prefill"], add_special_tokens=False
    )
    user_label = tokenizer.encode("user", add_special_tokens=False)
    asst_label = tokenizer.encode("assistant", add_special_tokens=False)

    ids = (
        [im_start] + user_label + nl + user_text_ids + [im_end] + nl
        + [im_start] + asst_label + nl + prefill_ids
    )
    return ids


def generate_single_branch(
    model, tokenizer, prompt_tokens: list[int], temperature: float
) -> tuple[list[TokenData], list[tuple[int, int]]]:
    """Generate one branch, return tokens and branching candidates.

    Returns:
        tokens: list of TokenData for this branch
        candidates: list of (token_index, runner_up_token_id) for possible branches
    """
    tokens: list[TokenData] = []
    candidates: list[tuple[int, int]] = []

    eos_ids = set()
    if tokenizer.eos_token_id is not None:
        eos_ids.add(tokenizer.eos_token_id)
    for special in ("<|im_end|>", "<|endoftext|>"):
        tid = tokenizer.convert_tokens_to_ids(special)
        if tid is not None and isinstance(tid, int):
            eos_ids.add(tid)

    sampler = make_sampler(temp=temperature if temperature > 0 else 0.0)
    prompt = mx.array(prompt_tokens)

    for token, logprobs_vec in generate_step(
        prompt, model, max_tokens=MAX_TOKENS, sampler=sampler
    ):
        token_id = token.item() if hasattr(token, "item") else int(token)
        logprobs_vec = logprobs_vec.squeeze()

        # Get top-K by log-prob value
        top_k_indices = mx.argpartition(logprobs_vec, kth=-TOP_K_STORE)[-TOP_K_STORE:]
        top_k_logprobs = logprobs_vec[top_k_indices]

        sort_order = mx.argsort(top_k_logprobs)[::-1]
        top_k_indices = top_k_indices[sort_order]
        top_k_logprobs = top_k_logprobs[sort_order]

        top_k_indices_list = top_k_indices.tolist()
        top_k_logprobs_list = top_k_logprobs.tolist()

        top_logprobs = [
            (tid, get_token_text(tokenizer, tid), round(lp, 4))
            for tid, lp in zip(top_k_indices_list, top_k_logprobs_list)
        ]

        token_text = get_token_text(tokenizer, token_id)
        tokens.append(
            TokenData(
                token_id=token_id, token_text=token_text, top_logprobs=top_logprobs
            )
        )

        # Check for branching candidates
        if temperature > 0 and len(tokens) > 1:
            probs = logprobs_to_probs(
                [lp for _, _, lp in top_logprobs[:10]], temperature
            )
            if len(probs) >= 2 and probs[1] > BRANCH_THRESHOLD:
                runner_up_id = top_logprobs[1][0]
                candidates.append((len(tokens) - 1, runner_up_id))

        if token_id in eos_ids:
            break

    return tokens, candidates


def generate_tree(
    model, tokenizer, prompt_config: dict, temperature: float
) -> list[Branch]:
    """Generate a branching tree at a given temperature."""
    prompt_token_ids = build_prompt_ids(tokenizer, prompt_config)
    branches: list[Branch] = []
    branch_id_counter = 0

    # Queue entries: (parent_branch_id | None, fork_index, token_ids)
    queue: list[tuple[int | None, int, list[int]]] = [
        (None, 0, prompt_token_ids)
    ]

    while queue and len(branches) < MAX_BRANCHES:
        parent_id, fork_index, context_ids = queue.pop(0)

        tokens, candidates = generate_single_branch(
            model, tokenizer, context_ids, temperature
        )

        branch = Branch(
            id=branch_id_counter,
            parent_id=parent_id,
            fork_token_index=fork_index,
            tokens=tokens,
        )
        branches.append(branch)
        branch_id_counter += 1

        # Queue child branches for interesting fork points
        for tok_idx, runner_up_id in candidates:
            if len(branches) + len(queue) >= MAX_BRANCHES:
                break
            # Context = original prompt + tokens up to fork + runner-up token
            child_ids = (
                context_ids
                + [t.token_id for t in tokens[:tok_idx]]
                + [runner_up_id]
            )
            queue.append((branch.id, tok_idx, child_ids))

    return branches


def serialize_tree(branches: list[Branch]) -> list[dict]:
    result = []
    for b in branches:
        tokens = []
        for t in b.tokens:
            tokens.append(
                {
                    "id": t.token_id,
                    "text": t.token_text,
                    "logprobs": [
                        [tid, text, lp] for tid, text, lp in t.top_logprobs
                    ],
                }
            )
        result.append(
            {
                "id": b.id,
                "parentId": b.parent_id,
                "forkIndex": b.fork_token_index,
                "tokens": tokens,
            }
        )
    return result


def main():
    print(f"Loading model: {MODEL_ID}")
    t0 = time.time()
    model, tokenizer = load(MODEL_ID)
    print(f"Model loaded in {time.time() - t0:.1f}s")

    # Pre-warm vocab cache
    vocab_size = tokenizer.vocab_size or 250000
    print(f"Building vocab cache ({vocab_size} tokens)... ", end="", flush=True)
    for tid in range(vocab_size):
        _vocab_cache[tid] = tokenizer.decode([tid])
    print("done.\n")

    output_dir = Path(__file__).parent.parent / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    all_data = []

    for i, prompt_config in enumerate(PROMPTS):
        print(
            f"[{i + 1}/{len(PROMPTS)}] {prompt_config['category']} / "
            f"{prompt_config['level']}: {prompt_config['label']}"
        )

        trees_by_temp = {}
        for temp in TEMPERATURES:
            temp_key = str(temp)
            print(f"  T={temp} ... ", end="", flush=True)
            branches = generate_tree(model, tokenizer, prompt_config, temp)
            trees_by_temp[temp_key] = serialize_tree(branches)
            total_tokens = sum(len(b.tokens) for b in branches)
            print(f"{len(branches)} branches, {total_tokens} tokens")

        # Store prefill tokens for greyed-out display
        prefill_ids = build_prompt_ids(tokenizer, prompt_config)
        prefill_tokens = []
        for tid in prefill_ids:
            prefill_tokens.append({"id": tid, "text": tokenizer.decode([tid])})

        all_data.append(
            {
                "category": prompt_config["category"],
                "level": prompt_config["level"],
                "label": prompt_config["label"],
                "prefill": prompt_config["prefill"],
                "prefillTokens": prefill_tokens,
                "trees": trees_by_temp,
            }
        )

    output_path = output_dir / "temperature-trees.json"
    with open(output_path, "w") as f:
        json.dump(all_data, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"\nDone! Wrote {output_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()

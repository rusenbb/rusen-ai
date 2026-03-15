"""
Generate pre-computed temperature trees for the Temperature Playground.

Runs Qwen3-4B-Instruct-2507 via transformers on CUDA, generates branching
trees at 4 temperatures for 27 prompts (9 categories x 3 determinism levels),
stores log-probs so the client can compute softmax at any temperature.

Usage:
    uv run scripts/generate_temperature_trees.py

Output:
    generated/temperature-playground/temperature-trees.json
"""

import json
import math
import time
from pathlib import Path
from dataclasses import dataclass, field

import torch
import torch.nn.functional as F
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = "Qwen/Qwen3-4B-Instruct-2507"
TEMPERATURES = [0.0, 0.3, 0.6, 1.0]
TOP_K_STORE = 100
MAX_TOKENS = 50
BRANCH_THRESHOLD = 0.10  # branch when best alternative prob > 10%
MAX_BRANCHES = 12
MIN_FORK_SPACING = 5  # minimum tokens between fork points on the same branch
MAX_FORKS_PER_BRANCH = 3  # max fork points selected per branch
MAX_GENERATION = 3  # main=0, child=1, grandchild=2, great-grandchild=3

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
    # The token that caused the fork (the runner-up that was chosen
    # instead of the parent's sampled token at fork_token_index).
    # None for the main/root branch.
    fork_token_id: int | None = None
    fork_token_text: str | None = None
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


def pick_branch_alternative(
    top_logprobs: list[tuple[int, str, float]],
    sampled_token_id: int,
    temperature: float,
) -> tuple[int, float] | None:
    """Pick the best alternative token for branching.

    `top_logprobs` are already sorted by probability descending, so the first
    token whose ID differs from the sampled token is the best alternative.
    """
    candidate_slice = top_logprobs[:10]
    if len(candidate_slice) < 2:
        return None

    probs = logprobs_to_probs(
        [lp for _, _, lp in candidate_slice],
        temperature,
    )

    for idx, (token_id, _text, _logprob) in enumerate(candidate_slice):
        if token_id == sampled_token_id:
            continue
        return token_id, probs[idx]

    return None


def build_prompt_ids(tokenizer, prompt_config: dict) -> list[int]:
    """Build prompt token IDs for the chat template.

    For code-only prompts (no system message), encodes the prefill directly.
    For chat prompts, constructs:
        <|im_start|>user\n{instruction}<|im_end|>\n
        <|im_start|>assistant\n{prefill}
    No thinking block needed — Qwen3-4B-Instruct-2507 is the non-thinking variant.
    """
    if not prompt_config["system"]:
        return tokenizer.encode(prompt_config["prefill"], add_special_tokens=False)

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
        + [im_start] + asst_label + nl
        + prefill_ids
    )
    return ids


def generate_single_branch(
    model, tokenizer, prompt_tokens: list[int], temperature: float
) -> tuple[list[TokenData], list[tuple[int, int, float]]]:
    """Generate one branch, return tokens and branching candidates.

    Returns:
        tokens: list of TokenData for this branch
        candidates: list of (token_index, alternative_token_id, alternative_prob)
    """
    tokens: list[TokenData] = []
    candidates: list[tuple[int, int, float]] = []

    eos_ids = set()
    if tokenizer.eos_token_id is not None:
        eos_ids.add(tokenizer.eos_token_id)
    for special in ("<|im_end|>", "<|endoftext|>"):
        tid = tokenizer.convert_tokens_to_ids(special)
        if tid is not None and isinstance(tid, int):
            eos_ids.add(tid)

    device = next(model.parameters()).device
    input_ids = torch.tensor([prompt_tokens], device=device)
    past_key_values = None

    for _step in range(MAX_TOKENS):
        with torch.no_grad():
            outputs = model(
                input_ids,
                past_key_values=past_key_values,
                use_cache=True,
            )

        logits = outputs.logits[:, -1, :]  # (1, vocab_size)
        past_key_values = outputs.past_key_values

        # Log-probabilities over full vocab (at T=1)
        logprobs_vec = F.log_softmax(logits, dim=-1).squeeze(0)  # (vocab_size,)

        # Sample or greedy
        if temperature > 0:
            probs = F.softmax(logits / temperature, dim=-1)
            token_id = torch.multinomial(probs.squeeze(0), num_samples=1).item()
        else:
            token_id = logits.argmax(dim=-1).squeeze().item()

        # Top-K extraction
        top_k_logprobs, top_k_indices = torch.topk(logprobs_vec, TOP_K_STORE)
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
            alternative = pick_branch_alternative(
                top_logprobs,
                token_id,
                temperature,
            )
            if alternative is not None:
                alternative_id, alternative_prob = alternative
                if alternative_prob > BRANCH_THRESHOLD:
                    candidates.append(
                        (len(tokens) - 1, alternative_id, alternative_prob)
                    )

        if token_id in eos_ids:
            break

        # Next step: feed only the new token (KV cache has the rest)
        input_ids = torch.tensor([[token_id]], device=device)

    return tokens, candidates


def select_fork_points(
    candidates: list[tuple[int, int, float]],
) -> list[tuple[int, int]]:
    """Pick the best fork points from candidates, spaced apart.

    candidates: list of (token_index, alternative_id, alternative_prob)
    Returns: list of (token_index, alternative_id), up to MAX_FORKS_PER_BRANCH,
             sorted by token index, with at least MIN_FORK_SPACING between them.
    """
    # Sort by probability descending — pick the most interesting ones first
    ranked = sorted(candidates, key=lambda c: c[2], reverse=True)

    selected: list[tuple[int, int]] = []
    used_positions: list[int] = []

    for tok_idx, alternative_id, _prob in ranked:
        if len(selected) >= MAX_FORKS_PER_BRANCH:
            break
        # Check spacing against already-selected positions
        too_close = any(abs(tok_idx - pos) < MIN_FORK_SPACING for pos in used_positions)
        if too_close:
            continue
        selected.append((tok_idx, alternative_id))
        used_positions.append(tok_idx)

    return selected


def generate_tree(
    model, tokenizer, prompt_config: dict, temperature: float
) -> list[Branch]:
    """Generate a branching tree at a given temperature.

    Strategy:
    1. Generate the full main branch, collecting all branching candidates.
    2. Select spaced-out, high-interest fork points (not every candidate).
    3. Generate child branches from those forks (depth 1).
    4. Repeat until the configured branch depth limit is reached.
    """
    prompt_token_ids = build_prompt_ids(tokenizer, prompt_config)
    branches: list[Branch] = []
    branch_id_counter = 0

    # Queue: (parent_id, fork_index, fork_token_id, fork_token_text, context_ids, generation)
    queue: list[tuple[int | None, int, int | None, str | None, list[int], int]] = [
        (None, 0, None, None, prompt_token_ids, 0)
    ]

    while queue and len(branches) < MAX_BRANCHES:
        parent_id, fork_index, fork_tid, fork_text, context_ids, generation = queue.pop(0)

        tokens, candidates = generate_single_branch(
            model, tokenizer, context_ids, temperature
        )

        branch = Branch(
            id=branch_id_counter,
            parent_id=parent_id,
            fork_token_index=fork_index,
            fork_token_id=fork_tid,
            fork_token_text=fork_text,
            tokens=tokens,
        )
        branches.append(branch)
        branch_id_counter += 1

        # Don't branch beyond the configured depth.
        if generation >= MAX_GENERATION:
            continue

        # Select spaced-out, high-interest fork points
        selected = select_fork_points(candidates)

        for tok_idx, alternative_id in selected:
            if len(branches) + len(queue) >= MAX_BRANCHES:
                break
            child_ids = (
                context_ids
                + [t.token_id for t in tokens[:tok_idx]]
                + [alternative_id]
            )
            alternative_text = get_token_text(tokenizer, alternative_id)
            queue.append(
                (
                    branch.id,
                    tok_idx,
                    alternative_id,
                    alternative_text,
                    child_ids,
                    generation + 1,
                )
            )

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
        entry: dict = {
            "id": b.id,
            "parentId": b.parent_id,
            "forkIndex": b.fork_token_index,
            "tokens": tokens,
        }
        if b.fork_token_id is not None:
            entry["forkTokenId"] = b.fork_token_id
            entry["forkTokenText"] = b.fork_token_text
        result.append(entry)
    return result


def main():
    print(f"Loading model: {MODEL_ID}")
    t0 = time.time()

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        dtype=torch.bfloat16,
        device_map="auto",
    )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

    print(f"Model loaded in {time.time() - t0:.1f}s")

    # Pre-warm vocab cache
    vocab_size = tokenizer.vocab_size or 250000
    print(f"Building vocab cache ({vocab_size} tokens)... ", end="", flush=True)
    for tid in range(vocab_size):
        _vocab_cache[tid] = tokenizer.decode([tid])
    print("done.\n")

    output_dir = (
        Path(__file__).parent.parent
        / "generated"
        / "temperature-playground"
    )
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

        # Store only the user-visible prefill tokens for greyed-out display
        # (not the chat template / thinking block tokens)
        visible_prefill_ids = tokenizer.encode(
            prompt_config["prefill"], add_special_tokens=False
        )
        prefill_tokens = []
        for tid in visible_prefill_ids:
            prefill_tokens.append({"id": tid, "text": get_token_text(tokenizer, tid)})

        all_data.append(
            {
                "category": prompt_config["category"],
                "level": prompt_config["level"],
                "label": prompt_config["label"],
                "system": prompt_config["system"],
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

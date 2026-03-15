"""Train the browser artifact for RuseN-Gram from split external corpora.

The exported artifact contains:

- a shared learned BPE tokenizer foundation for Rusenizer v2
- base and assistant interpolated n-gram language models
- learned prompt-response lexical features from assistant data
- evaluation metadata from held-out validation splits

Usage:
    uv run python scripts/train_ruse_ngram.py
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).parent.parent
CONTENT_DIR = ROOT / "src" / "content" / "rusen-gram"
BASE_CORPUS = CONTENT_DIR / "base-corpus.tr.jsonl"
ASSISTANT_CORPUS = CONTENT_DIR / "assistant-corpus.tr.jsonl"
OUTPUT = ROOT / "public" / "rusen-gram" / "model-v2.json"
FOUNDATION_OUTPUT = ROOT / "public" / "rusenizer" / "foundation-v2.json"

UNK = "<unk>"
BOS = "<s>"
EOS = "</s>"
USER = "<|user|>"
ASSISTANT = "<|assistant|>"
WORD_START = "▁"
SPECIAL_TOKENS = [UNK, BOS, EOS, USER, ASSISTANT]

TARGET_VOCAB_SIZE = 640
MIN_PAIR_FREQUENCY = 2
MODEL_ORDER = 4
DISCOUNT = 0.75
PROMPT_FEATURE_WINDOW = 12
PROMPT_FEATURE_TOP_RESPONSES = 24
PROMPT_FEATURE_GRID = [0.0, 0.5, 1.0, 1.5, 2.0]
BLEND_GRID = [0.55, 0.7, 0.82, 0.9, 0.96]
TOKENIZER_STATS_SPLITS = ("validation", "test")
TUNING_RECORD_LIMIT = 40
WS_RE = re.compile(r"\s+")
LEXICAL_RE = re.compile(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]+")


@dataclass(frozen=True)
class CorpusRecord:
    id: str
    source: str
    domain: str
    split: str
    text: str
    prompt: str | None = None
    completion: str | None = None


@dataclass
class BPETokenizer:
    pieces: list[str]
    merges: list[tuple[int, int, int]]
    special_ids: dict[str, int]

    def __post_init__(self) -> None:
        self.piece_to_id = {piece: idx for idx, piece in enumerate(self.pieces)}
        self.merge_lookup = {
            (left, right): (rank, merged)
            for rank, (left, right, merged) in enumerate(self.merges)
        }

    def encode_word(self, word: str) -> list[int]:
        if not word:
            return []

        piece_ids: list[int] = []
        try:
            chars = list(word)
            first, *rest = chars
            piece_ids.append(self.piece_to_id[f"{WORD_START}{first}"])
            piece_ids.extend(self.piece_to_id[char] for char in rest)
        except KeyError:
            return [self.special_ids[UNK]]

        while len(piece_ids) > 1:
            best_rank: int | None = None
            best_index = -1
            best_merged = -1

            for index in range(len(piece_ids) - 1):
                pair = (piece_ids[index], piece_ids[index + 1])
                merge_info = self.merge_lookup.get(pair)
                if merge_info is None:
                    continue
                rank, merged = merge_info
                if best_rank is None or rank < best_rank:
                    best_rank = rank
                    best_index = index
                    best_merged = merged

            if best_rank is None:
                break

            piece_ids = (
                piece_ids[:best_index]
                + [best_merged]
                + piece_ids[best_index + 2 :]
            )

        return piece_ids

    def encode_words(self, words: Iterable[str]) -> list[int]:
        ids: list[int] = []
        for word in words:
            if word in self.special_ids:
                ids.append(self.special_ids[word])
            else:
                ids.extend(self.encode_word(word))
        return ids


@dataclass
class NGramModel:
    order: int
    discount: float
    vocabulary_size: int
    rows: dict[int, dict[tuple[int, ...], Counter[int]]]
    continuation_counts: Counter[int]
    total_continuations: int

    def __post_init__(self) -> None:
        self.context_totals = {
            length: {
                context: sum(counter.values())
                for context, counter in rows.items()
            }
            for length, rows in self.rows.items()
        }
        self.unique_followers = {
            length: {
                context: len(counter)
                for context, counter in rows.items()
            }
            for length, rows in self.rows.items()
        }

    def probability(self, token_id: int, context: list[int]) -> float:
        trimmed = tuple(context[-(self.order - 1) :])
        return self._probability_recursive(token_id, trimmed)

    def _probability_recursive(self, token_id: int, context: tuple[int, ...]) -> float:
        if not context:
            continuation = self.continuation_counts.get(token_id, 0)
            if self.total_continuations == 0:
                return 1.0 / self.vocabulary_size
            if continuation == 0:
                return 1.0 / (self.total_continuations + self.vocabulary_size)
            return continuation / self.total_continuations

        row = self.rows[len(context)].get(context)
        if row is None:
            return self._probability_recursive(token_id, context[1:])

        total = self.context_totals[len(context)][context]
        unique = self.unique_followers[len(context)][context]
        count = row.get(token_id, 0)

        observed = max(count - self.discount, 0.0) / total
        backoff = (self.discount * unique) / total
        return observed + backoff * self._probability_recursive(token_id, context[1:])


@dataclass(frozen=True)
class StartWordEntry:
    word: str
    token_ids: list[int]
    count: int


def normalize_text(text: str) -> str:
    return WS_RE.sub(" ", text).strip()


def split_words(text: str) -> list[str]:
    text = normalize_text(text)
    if not text:
        return []
    return text.split(" ")


def extract_lexical_words(text: str) -> list[str]:
    return [match.casefold() for match in LEXICAL_RE.findall(text)]


def read_jsonl(path: Path) -> list[CorpusRecord]:
    records: list[CorpusRecord] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            records.append(CorpusRecord(**json.loads(line)))
    return records


def record_to_word_sequence(record: CorpusRecord) -> list[str]:
    if record.domain == "assistant":
        if not record.prompt or not record.completion:
            raise ValueError(f"Assistant record {record.id} is missing prompt/completion")
        return [USER, *split_words(record.prompt), ASSISTANT, *split_words(record.completion)]
    return split_words(record.text)


def build_word_frequencies(records: list[CorpusRecord]) -> Counter[tuple[str, ...]]:
    frequencies: Counter[tuple[str, ...]] = Counter()
    for record in records:
        for word in record_to_word_sequence(record):
            if word in SPECIAL_TOKENS:
                continue
            chars = list(word)
            if not chars:
                continue
            first, *rest = chars
            frequencies[tuple([f"{WORD_START}{first}", *rest])] += 1
    return frequencies


def merge_pair_in_symbols(
    symbols: tuple[str, ...],
    pair: tuple[str, str],
    merged: str,
) -> tuple[str, ...]:
    output: list[str] = []
    index = 0
    while index < len(symbols):
        if index < len(symbols) - 1 and (symbols[index], symbols[index + 1]) == pair:
            output.append(merged)
            index += 2
        else:
            output.append(symbols[index])
            index += 1
    return tuple(output)


def train_bpe_tokenizer(records: list[CorpusRecord]) -> BPETokenizer:
    word_frequencies = build_word_frequencies(records)
    if not word_frequencies:
        raise RuntimeError("Cannot train tokenizer on an empty corpus")

    alphabet = {WORD_START}
    for symbols in word_frequencies:
        alphabet.update(symbols)

    merges: list[tuple[str, str, str]] = []
    pieces = set(alphabet)
    total_target = max(TARGET_VOCAB_SIZE - len(SPECIAL_TOKENS), len(pieces))

    while len(pieces) < total_target:
        pair_counts: Counter[tuple[str, str]] = Counter()
        for symbols, frequency in word_frequencies.items():
            for index in range(len(symbols) - 1):
                pair_counts[(symbols[index], symbols[index + 1])] += frequency

        if not pair_counts:
            break

        best_pair, best_frequency = pair_counts.most_common(1)[0]
        if best_frequency < MIN_PAIR_FREQUENCY:
            break

        merged = f"{best_pair[0]}{best_pair[1]}"
        merges.append((best_pair[0], best_pair[1], merged))
        pieces.add(merged)

        updated: Counter[tuple[str, ...]] = Counter()
        for symbols, frequency in word_frequencies.items():
            updated[merge_pair_in_symbols(symbols, best_pair, merged)] += frequency
        word_frequencies = updated

        if len(merges) % 50 == 0:
            print(
                f"Tokenizer merges: {len(merges)}/{total_target - len(alphabet)}",
                flush=True,
            )

    ordered_pieces = [*SPECIAL_TOKENS, *sorted(alphabet)]
    for _, _, merged in merges:
        if merged not in ordered_pieces:
            ordered_pieces.append(merged)

    piece_to_id = {piece: idx for idx, piece in enumerate(ordered_pieces)}
    merge_ids = [
        (piece_to_id[left], piece_to_id[right], piece_to_id[merged])
        for left, right, merged in merges
    ]
    special_ids = {piece: piece_to_id[piece] for piece in SPECIAL_TOKENS}
    return BPETokenizer(ordered_pieces, merge_ids, special_ids)


def encode_record(record: CorpusRecord, tokenizer: BPETokenizer) -> list[int]:
    return tokenizer.encode_words(record_to_word_sequence(record))


def train_ngram_model(
    sequences: list[list[int]],
    vocabulary_size: int,
    bos_id: int,
    eos_id: int,
) -> NGramModel:
    rows: dict[int, dict[tuple[int, ...], Counter[int]]] = {
        context_len: defaultdict(Counter)
        for context_len in range(MODEL_ORDER)
    }

    for token_ids in sequences:
        sequence = [bos_id] * (MODEL_ORDER - 1)
        sequence.extend(token_ids)
        sequence.append(eos_id)

        for index in range(MODEL_ORDER - 1, len(sequence)):
            next_token = sequence[index]
            for context_len in range(MODEL_ORDER):
                context = tuple(sequence[index - context_len : index])
                rows[context_len][context][next_token] += 1

    continuation_counts: Counter[int] = Counter()
    for followers in rows[1].values():
        for token_id in followers:
            continuation_counts[token_id] += 1

    return NGramModel(
        order=MODEL_ORDER,
        discount=DISCOUNT,
        vocabulary_size=vocabulary_size,
        rows=rows,
        continuation_counts=continuation_counts,
        total_continuations=sum(continuation_counts.values()),
    )


def is_lexical_piece(piece: str) -> bool:
    surface = piece.replace(WORD_START, "")
    return bool(surface) and any(char.isalnum() for char in surface)


def build_prompt_features(
    assistant_records: list[CorpusRecord],
    tokenizer: BPETokenizer,
) -> dict[str, dict[int, float]]:
    prompt_counts: Counter[str] = Counter()
    response_counts: Counter[int] = Counter()
    pair_counts: dict[str, Counter[int]] = defaultdict(Counter)

    for record in assistant_records:
        if not record.prompt or not record.completion:
            continue

        prompt_words = sorted(set(extract_lexical_words(record.prompt)))
        response_words = extract_lexical_words(record.completion)[:PROMPT_FEATURE_WINDOW]
        response_start_ids = []
        for word in response_words:
            word_ids = tokenizer.encode_words([word])
            if not word_ids:
                continue
            response_start_ids.append(word_ids[0])

        if not prompt_words or not response_start_ids:
            continue

        prompt_counts.update(prompt_words)
        response_counts.update(response_start_ids)
        for prompt_word in prompt_words:
            for response_id in response_start_ids:
                pair_counts[prompt_word][response_id] += 1

    total_response = sum(response_counts.values())
    response_vocab = max(len(response_counts), 1)
    alpha = 0.25

    weights: dict[str, dict[int, float]] = {}
    for prompt_word, counter in pair_counts.items():
        prompt_total = prompt_counts[prompt_word]
        scored: list[tuple[int, float]] = []
        for response_id, joint_count in counter.items():
            conditional = math.log(
                (joint_count + alpha)
                / (prompt_total + alpha * response_vocab)
            )
            baseline = math.log(
                (response_counts[response_id] + alpha)
                / (total_response + alpha * response_vocab)
            )
            lift = conditional - baseline
            if lift <= 0:
                continue
            scored.append((response_id, lift))

        if not scored:
            continue

        scored.sort(key=lambda item: item[1], reverse=True)
        weights[prompt_word] = {
            response_id: score
            for response_id, score in scored[:PROMPT_FEATURE_TOP_RESPONSES]
        }

    return weights


def build_start_word_model(
    assistant_records: list[CorpusRecord],
    tokenizer: BPETokenizer,
) -> tuple[list[StartWordEntry], dict[str, dict[str, float]]]:
    start_counts: Counter[str] = Counter()
    prompt_counts: Counter[str] = Counter()
    pair_counts: dict[str, Counter[str]] = defaultdict(Counter)
    token_ids_by_word: dict[str, list[int]] = {}

    for record in assistant_records:
        if not record.prompt or not record.completion:
            continue

        response_words = split_words(record.completion)
        if not response_words:
            continue
        start_word = response_words[0]
        token_ids = tokenizer.encode_words([start_word])
        if not token_ids:
            continue

        token_ids_by_word.setdefault(start_word, token_ids)
        start_counts[start_word] += 1
        prompt_words = sorted(set(extract_lexical_words(record.prompt)))
        prompt_counts.update(prompt_words)
        for prompt_word in prompt_words:
            pair_counts[prompt_word][start_word] += 1

    total_starts = sum(start_counts.values())
    start_vocab = max(len(start_counts), 1)
    alpha = 0.25
    prompt_to_start: dict[str, dict[str, float]] = {}

    for prompt_word, counter in pair_counts.items():
        prompt_total = prompt_counts[prompt_word]
        scored: list[tuple[str, float]] = []
        for start_word, joint_count in counter.items():
            conditional = math.log(
                (joint_count + alpha)
                / (prompt_total + alpha * start_vocab)
            )
            baseline = math.log(
                (start_counts[start_word] + alpha)
                / (total_starts + alpha * start_vocab)
            )
            lift = conditional - baseline
            if lift <= 0:
                continue
            scored.append((start_word, lift))

        if not scored:
            continue

        scored.sort(key=lambda item: item[1], reverse=True)
        prompt_to_start[prompt_word] = {
            start_word: score for start_word, score in scored[:24]
        }

    start_words = [
        StartWordEntry(
            word=word,
            token_ids=token_ids_by_word[word],
            count=count,
        )
        for word, count in start_counts.most_common(160)
        if word in token_ids_by_word
    ]
    return start_words, prompt_to_start


def candidate_ids(tokenizer: BPETokenizer) -> list[int]:
    blocked = {
        tokenizer.special_ids[UNK],
        tokenizer.special_ids[BOS],
        tokenizer.special_ids[USER],
        tokenizer.special_ids[ASSISTANT],
    }
    return [token_id for token_id in range(len(tokenizer.pieces)) if token_id not in blocked]


def piece_prompt_feature_score(
    prompt_words: set[str],
    candidate_id: int,
    prompt_features: dict[str, dict[int, float]],
) -> float:
    total = 0.0
    for prompt_word in prompt_words:
        total += prompt_features.get(prompt_word, {}).get(candidate_id, 0.0)
    return total


def blended_distribution(
    context: list[int],
    prompt_words: set[str],
    generated_steps: int,
    blend: float,
    prompt_scale: float,
    candidate_token_ids: list[int],
    base_model: NGramModel,
    assistant_model: NGramModel,
    prompt_features: dict[str, dict[int, float]],
    assistant_special_id: int,
    eos_id: int,
) -> dict[int, float]:
    raw: dict[int, float] = {}
    for candidate_id in candidate_token_ids:
        base_prob = base_model.probability(candidate_id, context)
        assistant_prob = assistant_model.probability(candidate_id, context)
        mixed_prob = ((1.0 - blend) * base_prob) + (blend * assistant_prob)
        if candidate_id == eos_id and context and context[-1] == assistant_special_id:
            mixed_prob *= 0.3

        feature_bonus = 0.0
        if generated_steps < PROMPT_FEATURE_WINDOW:
            feature_bonus = piece_prompt_feature_score(
                prompt_words,
                candidate_id,
                prompt_features,
            )

        raw[candidate_id] = mixed_prob * math.exp(prompt_scale * feature_bonus)

    total = sum(raw.values())
    if total == 0:
        uniform = 1.0 / len(candidate_token_ids)
        return {candidate_id: uniform for candidate_id in candidate_token_ids}
    return {candidate_id: value / total for candidate_id, value in raw.items()}


def sequence_mixture_probability(
    token_ids: list[int],
    context: list[int],
    base_model: NGramModel,
    assistant_model: NGramModel,
    blend: float,
) -> float:
    probability_mass = 1.0
    running_context = list(context)
    for token_id in token_ids:
        base_prob = base_model.probability(token_id, running_context)
        assistant_prob = assistant_model.probability(token_id, running_context)
        probability_mass *= ((1.0 - blend) * base_prob) + (blend * assistant_prob)
        running_context.append(token_id)
    return probability_mass


def start_prompt_feature_score(
    prompt_words: set[str],
    candidate: str,
    prompt_features: dict[str, dict[str, float]],
) -> float:
    total = 0.0
    for prompt_word in prompt_words:
        total += prompt_features.get(prompt_word, {}).get(candidate, 0.0)
    return total


def start_word_distribution(
    start_words: list[StartWordEntry],
    prompt_words: set[str],
    context: list[int],
    base_model: NGramModel,
    assistant_model: NGramModel,
    prompt_features: dict[str, dict[str, float]],
    blend: float,
    prompt_scale: float,
) -> dict[str, float]:
    raw: dict[str, float] = {}
    for start_word in start_words:
        lexical_bonus = start_prompt_feature_score(
            prompt_words,
            start_word.word.casefold(),
            prompt_features,
        )
        base_probability = sequence_mixture_probability(
            start_word.token_ids,
            context,
            base_model,
            assistant_model,
            blend,
        )
        raw[start_word.word] = base_probability * math.exp(prompt_scale * lexical_bonus)

    total = sum(raw.values())
    if total == 0:
        uniform = 1.0 / max(len(start_words), 1)
        return {start_word.word: uniform for start_word in start_words}
    return {word: value / total for word, value in raw.items()}


def evaluate_base_perplexity(
    records: list[CorpusRecord],
    tokenizer: BPETokenizer,
    model: NGramModel,
) -> float:
    nll = 0.0
    token_count = 0
    for record in records:
        token_ids = encode_record(record, tokenizer)
        context = [tokenizer.special_ids[BOS]] * (MODEL_ORDER - 1)
        targets = [*token_ids, tokenizer.special_ids[EOS]]
        for token_id in targets:
            prob = model.probability(token_id, context)
            nll -= math.log(max(prob, 1e-12))
            token_count += 1
            context.append(token_id)
    return math.exp(nll / max(token_count, 1))


def evaluate_assistant_records(
    records: list[CorpusRecord],
    tokenizer: BPETokenizer,
    base_model: NGramModel,
    assistant_model: NGramModel,
    prompt_features: dict[str, dict[int, float]],
    blend: float,
    prompt_scale: float,
) -> tuple[float, float]:
    nll = 0.0
    total_tokens = 0
    top5_correct = 0
    candidate_token_ids = candidate_ids(tokenizer)

    for record in records:
        if not record.prompt or not record.completion:
            continue

        prompt_words = [USER, *split_words(record.prompt), ASSISTANT]
        prompt_token_ids = tokenizer.encode_words(prompt_words)
        prompt_feature_words = set(extract_lexical_words(record.prompt))
        response_token_ids = tokenizer.encode_words(split_words(record.completion))

        context = [tokenizer.special_ids[BOS]] * (MODEL_ORDER - 1)
        context.extend(prompt_token_ids)
        targets = [*response_token_ids, tokenizer.special_ids[EOS]]

        for generated_steps, token_id in enumerate(targets):
            distribution = blended_distribution(
                context=context,
                prompt_words=prompt_feature_words,
                generated_steps=generated_steps,
                blend=blend,
                prompt_scale=prompt_scale,
                candidate_token_ids=candidate_token_ids,
                base_model=base_model,
                assistant_model=assistant_model,
                prompt_features=prompt_features,
                assistant_special_id=tokenizer.special_ids[ASSISTANT],
                eos_id=tokenizer.special_ids[EOS],
            )
            sorted_candidates = sorted(
                distribution.items(),
                key=lambda item: item[1],
                reverse=True,
            )
            top_ids = [candidate_id for candidate_id, _ in sorted_candidates[:5]]
            if token_id in top_ids:
                top5_correct += 1

            prob = distribution.get(token_id, 1e-12)
            nll -= math.log(max(prob, 1e-12))
            total_tokens += 1
            context.append(token_id)

    perplexity = math.exp(nll / max(total_tokens, 1))
    accuracy = top5_correct / max(total_tokens, 1)
    return perplexity, accuracy


def evaluate_assistant_perplexity(
    records: list[CorpusRecord],
    tokenizer: BPETokenizer,
    base_model: NGramModel,
    assistant_model: NGramModel,
    prompt_features: dict[str, dict[int, float]],
    blend: float,
    prompt_scale: float,
) -> float:
    nll = 0.0
    total_tokens = 0
    candidate_token_ids = candidate_ids(tokenizer)

    for record in records:
        if not record.prompt or not record.completion:
            continue

        prompt_words = [USER, *split_words(record.prompt), ASSISTANT]
        prompt_token_ids = tokenizer.encode_words(prompt_words)
        prompt_feature_words = set(extract_lexical_words(record.prompt))
        response_token_ids = tokenizer.encode_words(split_words(record.completion))

        context = [tokenizer.special_ids[BOS]] * (MODEL_ORDER - 1)
        context.extend(prompt_token_ids)
        targets = [*response_token_ids, tokenizer.special_ids[EOS]]

        for generated_steps, token_id in enumerate(targets):
            distribution = blended_distribution(
                context=context,
                prompt_words=prompt_feature_words,
                generated_steps=generated_steps,
                blend=blend,
                prompt_scale=prompt_scale,
                candidate_token_ids=candidate_token_ids,
                base_model=base_model,
                assistant_model=assistant_model,
                prompt_features=prompt_features,
                assistant_special_id=tokenizer.special_ids[ASSISTANT],
                eos_id=tokenizer.special_ids[EOS],
            )

            prob = distribution.get(token_id, 1e-12)
            nll -= math.log(max(prob, 1e-12))
            total_tokens += 1
            context.append(token_id)

    return math.exp(nll / max(total_tokens, 1))


def evaluate_assistant_start(
    records: list[CorpusRecord],
    tokenizer: BPETokenizer,
    base_model: NGramModel,
    assistant_model: NGramModel,
    prompt_features: dict[str, dict[str, float]],
    start_words: list[StartWordEntry],
    blend: float,
    prompt_scale: float,
) -> tuple[float, float]:
    nll = 0.0
    total = 0
    top5 = 0

    for record in records:
        if not record.prompt or not record.completion:
            continue

        response_words = split_words(record.completion)
        if not response_words:
            continue
        target_word = response_words[0]

        prompt_words = [USER, *split_words(record.prompt), ASSISTANT]
        prompt_token_ids = tokenizer.encode_words(prompt_words)
        prompt_feature_words = set(extract_lexical_words(record.prompt))
        context = [tokenizer.special_ids[BOS]] * (MODEL_ORDER - 1)
        context.extend(prompt_token_ids)

        distribution = start_word_distribution(
            start_words=start_words,
            prompt_words=prompt_feature_words,
            context=context,
            blend=blend,
            prompt_scale=prompt_scale,
            base_model=base_model,
            assistant_model=assistant_model,
            prompt_features=prompt_features,
        )

        ranked = sorted(distribution.items(), key=lambda item: item[1], reverse=True)
        if target_word in [candidate_id for candidate_id, _ in ranked[:5]]:
            top5 += 1
        nll -= math.log(max(distribution.get(target_word, 1e-12), 1e-12))
        total += 1

    return math.exp(nll / max(total, 1)), top5 / max(total, 1)


def tune_assistant_parameters(
    records: list[CorpusRecord],
    tokenizer: BPETokenizer,
    base_model: NGramModel,
    assistant_model: NGramModel,
    prompt_features: dict[str, dict[str, float]],
    start_words: list[StartWordEntry],
) -> tuple[float, float, float]:
    best_blend = 1.0
    best_prompt_scale = 0.0
    best_perplexity = float("inf")
    best_top5 = -1.0
    for blend in BLEND_GRID:
        for prompt_scale in PROMPT_FEATURE_GRID:
            perplexity, top5 = evaluate_assistant_start(
                records=records,
                tokenizer=tokenizer,
                base_model=base_model,
                assistant_model=assistant_model,
                prompt_features=prompt_features,
                start_words=start_words,
                blend=blend,
                prompt_scale=prompt_scale,
            )
            if top5 > best_top5 or (top5 == best_top5 and perplexity < best_perplexity):
                best_blend = blend
                best_prompt_scale = prompt_scale
                best_perplexity = perplexity
                best_top5 = top5
        print(f"Tuning sweep finished for blend={blend:.2f}", flush=True)

    return best_blend, best_prompt_scale, best_perplexity


def tokenizer_stats_by_split(
    records: list[CorpusRecord],
    tokenizer: BPETokenizer,
) -> dict[str, dict[str, float]]:
    grouped: dict[str, dict[str, float]] = {}
    for split in TOKENIZER_STATS_SPLITS:
        split_records = [record for record in records if record.split == split]
        if not split_records:
            continue
        chars = 0
        tokens = 0
        for record in split_records:
            token_ids = encode_record(record, tokenizer)
            tokens += len(token_ids)
            chars += len(record.text)
        grouped[split] = {
            "documents": len(split_records),
            "charsPerToken": round(chars / max(tokens, 1), 4),
            "tokensPerDocument": round(tokens / max(len(split_records), 1), 2),
        }
    return grouped


def serialize_model(model: NGramModel) -> dict:
    serialized_rows: dict[str, list[list[object]]] = {}
    for context_len in range(1, MODEL_ORDER):
        rows = []
        for context, counter in sorted(model.rows[context_len].items()):
            followers = [[token_id, count] for token_id, count in counter.items()]
            rows.append(
                [
                    list(context),
                    model.context_totals[context_len][context],
                    model.unique_followers[context_len][context],
                    followers,
                ]
            )
        serialized_rows[str(context_len)] = rows

    return {
        "order": model.order,
        "discount": model.discount,
        "continuationCounts": [
            model.continuation_counts.get(token_id, 0)
            for token_id in range(model.vocabulary_size)
        ],
        "totalContinuations": model.total_continuations,
        "rows": serialized_rows,
    }


def serialize_prompt_features(prompt_features: dict[str, dict[int, float]]) -> list[list[object]]:
    rows = []
    for prompt_word in sorted(prompt_features):
        rows.append(
            [
                prompt_word,
                [
                    [response_token_id, round(score, 6)]
                    for response_token_id, score in sorted(
                        prompt_features[prompt_word].items(),
                        key=lambda item: item[1],
                        reverse=True,
                    )
                ],
            ]
        )
    return rows


def serialize_start_prompt_features(
    prompt_features: dict[str, dict[str, float]],
) -> list[list[object]]:
    rows = []
    for prompt_word in sorted(prompt_features):
        rows.append(
            [
                prompt_word,
                [
                    [start_word, round(score, 6)]
                    for start_word, score in sorted(
                        prompt_features[prompt_word].items(),
                        key=lambda item: item[1],
                        reverse=True,
                    )
                ],
            ]
        )
    return rows


def serialize_start_words(start_words: list[StartWordEntry]) -> list[list[object]]:
    return [
        [entry.word, entry.token_ids, entry.count]
        for entry in start_words
    ]


def corpus_counts(records: list[CorpusRecord]) -> dict[str, int]:
    counter = Counter(record.split for record in records)
    return {split: counter.get(split, 0) for split in ("train", "validation", "test")}


def source_counts(records: list[CorpusRecord]) -> dict[str, dict[str, int]]:
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for record in records:
        counts[record.source][record.split] += 1
    return {
        source: {split: counter.get(split, 0) for split in ("train", "validation", "test")}
        for source, counter in sorted(counts.items())
    }


def main() -> None:
    base_records = read_jsonl(BASE_CORPUS)
    assistant_records = read_jsonl(ASSISTANT_CORPUS)
    print(
        f"Loaded {len(base_records)} base and {len(assistant_records)} assistant records",
        flush=True,
    )

    train_records = [
        *[record for record in base_records if record.split == "train"],
        *[record for record in assistant_records if record.split == "train"],
    ]

    tokenizer = train_bpe_tokenizer(train_records)
    candidate_token_ids = candidate_ids(tokenizer)
    print(
        f"Tokenizer ready with {len(tokenizer.pieces)} pieces and {len(tokenizer.merges)} merges",
        flush=True,
    )

    base_train_sequences = [
        encode_record(record, tokenizer)
        for record in base_records
        if record.split == "train"
    ]
    assistant_train_sequences = [
        encode_record(record, tokenizer)
        for record in assistant_records
        if record.split == "train"
    ]

    base_model = train_ngram_model(
        base_train_sequences,
        len(tokenizer.pieces),
        tokenizer.special_ids[BOS],
        tokenizer.special_ids[EOS],
    )
    assistant_model = train_ngram_model(
        assistant_train_sequences,
        len(tokenizer.pieces),
        tokenizer.special_ids[BOS],
        tokenizer.special_ids[EOS],
    )
    print("Count models trained", flush=True)
    prompt_features = build_prompt_features(
        [record for record in assistant_records if record.split == "train"],
        tokenizer,
    )
    print(f"Prompt features ready for {len(prompt_features)} prompt pieces", flush=True)
    start_words, start_prompt_features = build_start_word_model(
        [record for record in assistant_records if record.split == "train"],
        tokenizer,
    )
    print(f"Assistant start model ready with {len(start_words)} start words", flush=True)

    base_validation_perplexity = evaluate_base_perplexity(
        [record for record in base_records if record.split == "test"],
        tokenizer,
        base_model,
    )
    assistant_validation_perplexity, assistant_validation_top5 = (
        evaluate_assistant_records(
            [record for record in assistant_records if record.split == "test"],
            tokenizer,
            base_model,
            assistant_model,
            prompt_features,
            blend=1.0,
            prompt_scale=0.0,
        )
    )
    default_blend, prompt_scale, tuned_validation_perplexity = (
        tune_assistant_parameters(
            sorted(
                [record for record in assistant_records if record.split == "validation"],
                key=lambda record: record.id,
            )[:TUNING_RECORD_LIMIT],
            tokenizer,
            base_model,
            assistant_model,
            start_prompt_features,
            start_words,
        )
    )
    print(
        f"Tuned assistant blend={default_blend:.2f}, prompt scale={prompt_scale:.2f}",
        flush=True,
    )
    blended_validation_perplexity, blended_validation_top5 = (
        evaluate_assistant_records(
            [record for record in assistant_records if record.split == "test"],
            tokenizer,
            base_model,
            assistant_model,
            prompt_features,
            blend=default_blend,
            prompt_scale=prompt_scale,
        )
    )

    artifact = {
        "version": "ruse-ngram-v2-bpe-kn",
        "tokenizer": {
            "kind": "rusen-bpe-v2",
            "pieces": tokenizer.pieces,
            "merges": [list(merge) for merge in tokenizer.merges],
            "special": tokenizer.special_ids,
        },
        "metadata": {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "corpus": {
                "base": corpus_counts(base_records),
                "assistant": corpus_counts(assistant_records),
                "sources": {
                    "base": source_counts(base_records),
                    "assistant": source_counts(assistant_records),
                },
            },
            "tokenizerEvaluation": {
                "base": tokenizer_stats_by_split(base_records, tokenizer),
                "assistant": tokenizer_stats_by_split(assistant_records, tokenizer),
                "vocabSize": len(tokenizer.pieces),
                "mergeCount": len(tokenizer.merges),
            },
            "evaluation": {
                "baseHeldoutPerplexity": round(base_validation_perplexity, 4),
                "assistantHeldoutPerplexity": round(
                    assistant_validation_perplexity,
                    4,
                ),
                "assistantHeldoutTop5": round(assistant_validation_top5, 4),
                "tunedValidationPerplexity": round(
                    tuned_validation_perplexity,
                    4,
                ),
                "blendedAssistantHeldoutPerplexity": round(
                    blended_validation_perplexity,
                    4,
                ),
                "blendedAssistantHeldoutTop5": round(
                    blended_validation_top5,
                    4,
                ),
                "defaultAssistantBlend": round(default_blend, 2),
                "promptFeatureScale": round(prompt_scale, 2),
            },
        },
        "models": {
            "candidateIds": candidate_token_ids,
            "base": serialize_model(base_model),
            "assistant": serialize_model(assistant_model),
        },
        "promptFeatures": {
            "maxGeneratedTokens": PROMPT_FEATURE_WINDOW,
            "scale": round(prompt_scale, 2),
            "rows": serialize_prompt_features(prompt_features),
        },
        "assistantStart": {
            "words": serialize_start_words(start_words),
            "promptRows": serialize_start_prompt_features(start_prompt_features),
        },
    }

    foundation_summary = {
        "version": artifact["version"],
        "tokenizer": artifact["metadata"]["tokenizerEvaluation"],
        "corpus": artifact["metadata"]["corpus"],
        "evaluation": artifact["metadata"]["evaluation"],
        "artifactPath": "/rusen-gram/model-v2.json",
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    FOUNDATION_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(artifact, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    FOUNDATION_OUTPUT.write_text(
        json.dumps(foundation_summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")
    print(f"Wrote {FOUNDATION_OUTPUT}")


if __name__ == "__main__":
    main()

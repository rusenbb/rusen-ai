/**
 * CLIP BPE tokenizer for SAM3's language encoder.
 *
 * Direct port of OpenAI's simple_tokenizer.py from the CLIP repo.
 * Loads vocabulary and merge table from HuggingFace at runtime (~1.4 MB,
 * gzipped ~500 KB by CDN). Cached after first load.
 */

const TOKENIZER_URL =
  "https://huggingface.co/rusen/sam3-browser-int8/resolve/main/clip_tokenizer.json";
const START_TOKEN = 49406;
const END_TOKEN = 49407;
const MAX_LENGTH = 32;

interface TokenizerData {
  byte_encoder: Record<string, string>;
  encoder: Record<string, number>;
  merges: string[];
}

let cachedTokenizer: SimpleTokenizer | null = null;

// ── BPE helpers ─────────────────────────────────────────────────────

function getPairs(word: string[]): Set<string> {
  const pairs = new Set<string>();
  for (let i = 0; i < word.length - 1; i++) {
    pairs.add(word[i] + "\0" + word[i + 1]);
  }
  return pairs;
}

// ── SimpleTokenizer class ───────────────────────────────────────────

class SimpleTokenizer {
  private byteEncoder: Record<number, string>;
  private encoder: Record<string, number>;
  private bpeRanks: Map<string, number>;
  private cache: Map<string, string>;
  private pat: RegExp;

  constructor(data: TokenizerData) {
    // Use provided byte_encoder or compute it
    this.byteEncoder = {};
    for (const [k, v] of Object.entries(data.byte_encoder)) {
      this.byteEncoder[parseInt(k)] = v;
    }

    this.encoder = data.encoder;

    this.bpeRanks = new Map();
    for (let i = 0; i < data.merges.length; i++) {
      const parts = data.merges[i].split(" ");
      this.bpeRanks.set(parts[0] + "\0" + parts[1], i);
    }

    this.cache = new Map([
      ["<|startoftext|>", "<|startoftext|>"],
      ["<|endoftext|>", "<|endoftext|>"],
    ]);

    this.pat =
      /<\|startoftext\|>|<\|endoftext\|>|'s|'t|'re|'ve|'m|'ll|'d|\w+|\d+|[^\s\w]+/gi;
  }

  private bpe(token: string): string {
    const cached = this.cache.get(token);
    if (cached !== undefined) return cached;

    let word = [...token.slice(0, -1), token[token.length - 1] + "</w>"];
    let pairs = getPairs(word);

    if (pairs.size === 0) {
      const result = token + "</w>";
      this.cache.set(token, result);
      return result;
    }

    while (true) {
      // Find the pair with the lowest rank
      let minRank = Infinity;
      let bigram = "";
      for (const pair of pairs) {
        const rank = this.bpeRanks.get(pair);
        if (rank !== undefined && rank < minRank) {
          minRank = rank;
          bigram = pair;
        }
      }

      if (minRank === Infinity) break;

      const [first, second] = bigram.split("\0");
      const newWord: string[] = [];
      let i = 0;

      while (i < word.length) {
        const j = word.indexOf(first, i);
        if (j === -1) {
          newWord.push(...word.slice(i));
          break;
        }

        newWord.push(...word.slice(i, j));
        i = j;

        if (
          word[i] === first &&
          i < word.length - 1 &&
          word[i + 1] === second
        ) {
          newWord.push(first + second);
          i += 2;
        } else {
          newWord.push(word[i]);
          i += 1;
        }
      }

      word = newWord;
      if (word.length === 1) break;
      pairs = getPairs(word);
    }

    const result = word.join(" ");
    this.cache.set(token, result);
    return result;
  }

  encode(text: string): number[] {
    const bpeTokens: number[] = [];
    // basic_clean + whitespace_clean + lowercase
    const cleaned = text.replace(/\s+/g, " ").trim().toLowerCase();

    // Reset lastIndex for global regex
    this.pat.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = this.pat.exec(cleaned)) !== null) {
      const token = match[0];
      // Convert each byte of the UTF-8 encoding to the byte_encoder mapping
      const encoded = new TextEncoder().encode(token);
      const bpeInput = Array.from(encoded)
        .map((b) => this.byteEncoder[b])
        .join("");

      for (const bpeToken of this.bpe(bpeInput).split(" ")) {
        const id = this.encoder[bpeToken];
        if (id !== undefined) {
          bpeTokens.push(id);
        }
      }
    }

    return bpeTokens;
  }
}

// ── Public API ──────────────────────────────────────────────────────

async function getTokenizer(): Promise<SimpleTokenizer> {
  if (cachedTokenizer) return cachedTokenizer;

  const response = await fetch(TOKENIZER_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch tokenizer: HTTP ${response.status}`);
  }
  const data: TokenizerData = await response.json();
  cachedTokenizer = new SimpleTokenizer(data);
  return cachedTokenizer;
}

/**
 * Tokenize a text prompt for SAM3's language encoder.
 * Returns an Int32Array of length 32.
 *
 * Format: [START, ...bpe_tokens, END, 0, 0, ...]
 */
export async function tokenize(text: string): Promise<Int32Array> {
  const tokenizer = await getTokenizer();
  const bpeTokens = tokenizer.encode(text);

  const tokens = new Int32Array(MAX_LENGTH);
  tokens[0] = START_TOKEN;

  const maxContent = MAX_LENGTH - 2; // room for START and END
  for (let i = 0; i < Math.min(bpeTokens.length, maxContent); i++) {
    tokens[i + 1] = bpeTokens[i];
  }
  tokens[Math.min(bpeTokens.length + 1, MAX_LENGTH - 1)] = END_TOKEN;

  return tokens;
}

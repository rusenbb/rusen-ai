/* tslint:disable */
/* eslint-disable */

export class Tokenizer {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Get the vocabulary size
   */
  vocab_size(): number;
  /**
   * Get the text representation of a token ID
   */
  id_to_token(id: number): string | undefined;
  /**
   * Get the token ID for a text (if it exists as a single token)
   */
  token_to_id(token: string): number | undefined;
  /**
   * Get detailed token information for visualization
   * Returns JSON array of TokenInfo objects
   */
  encode_with_info(text: string): string;
  /**
   * Create a new tokenizer from mergeable_ranks JSON
   * The JSON should be an object mapping base64-encoded token bytes to token IDs
   */
  constructor(mergeable_ranks_json: string);
  /**
   * Decode token IDs back to text
   */
  decode(ids: Uint32Array): string;
  /**
   * Encode text to token IDs
   */
  encode(text: string): Uint32Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_tokenizer_free: (a: number, b: number) => void;
  readonly tokenizer_decode: (a: number, b: number, c: number) => [number, number];
  readonly tokenizer_encode: (a: number, b: number, c: number) => [number, number];
  readonly tokenizer_encode_with_info: (a: number, b: number, c: number) => [number, number];
  readonly tokenizer_id_to_token: (a: number, b: number) => [number, number];
  readonly tokenizer_new: (a: number, b: number) => [number, number, number];
  readonly tokenizer_token_to_id: (a: number, b: number, c: number) => number;
  readonly tokenizer_vocab_size: (a: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

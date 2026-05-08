export type SentenceExample = {
  sentence: string;
  /** Index of the word (whitespace-split) that starts masked. */
  defaultMaskIndex: number;
};

export const EXAMPLES: SentenceExample[] = [
  { sentence: "Paris is the capital of France.", defaultMaskIndex: 3 },
  { sentence: "The cat sat on the mat.", defaultMaskIndex: 1 },
  { sentence: "She is reading a book in the park.", defaultMaskIndex: 4 },
  { sentence: "I drink coffee every morning.", defaultMaskIndex: 2 },
  { sentence: "The doctor performed a complicated surgery.", defaultMaskIndex: 4 },
  { sentence: "Beethoven was a famous German composer.", defaultMaskIndex: 5 },
  { sentence: "The economy is in serious trouble.", defaultMaskIndex: 4 },
  { sentence: "He plays football every weekend.", defaultMaskIndex: 1 },
];

export type DiscreteSymbol = number;

export type DiscretePrediction = {
  pmf: number[];
  argmax: DiscreteSymbol;
};

export type DiscreteTrial = {
  t: number;
  symbol: DiscreteSymbol;
  // The AI guess that was visibly highlighted in the arena at the moment the
  // user pressed. Snapshotted here so the pulse + lifetime tally reflect what
  // the user actually saw, not whichever predictor leads after the press.
  shownGuess: DiscreteSymbol;
  predictions: Record<string, DiscretePrediction>;
};

export type PredictorMeta = {
  id: string;
  label: string;
  blurb: string;
};

export type DiscreteSymbol = number;

export type DiscretePrediction = {
  pmf: number[];
  argmax: DiscreteSymbol;
};

export type DiscreteTrial = {
  t: number;
  symbol: DiscreteSymbol;
  predictions: Record<string, DiscretePrediction>;
};

export type PredictorMeta = {
  id: string;
  label: string;
  blurb: string;
};

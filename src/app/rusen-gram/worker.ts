import {
  generateNgram,
  inspectNgram,
  trainNgram,
  type NgramModel,
  type SampleStep,
} from "./model";
export type Request =
  | { id: number; action: "train"; corpus: string; order: number }
  | { id: number; action: "inspect"; prompt: string; alpha: number }
  | {
      id: number;
      action: "generate";
      prompt: string;
      alpha: number;
      seed: number;
      length: number;
      offset: number;
      token?: string;
    };
export type Response = {
  id: number;
  result?: ReturnType<typeof inspectNgram>;
  samples?: SampleStep[];
  error?: string;
  ready?: boolean;
};
let model: NgramModel | null = null;
self.onmessage = ({ data }: MessageEvent<Request>) => {
  try {
    if (data.action === "train") {
      model = trainNgram(data.corpus, data.order);
      self.postMessage({ id: data.id, ready: true });
      return;
    }
    if (!model) throw new Error("Choose a corpus first.");
    const response: Response =
      data.action === "generate"
        ? {
            id: data.id,
            samples: generateNgram(
              model,
              data.prompt,
              data.alpha,
              data.seed,
              data.length,
              data.offset,
              data.token,
            ),
          }
        : { id: data.id, result: inspectNgram(model, data.prompt, data.alpha) };
    // Full probabilities are unnecessary for rendering thousands of invisible rows.
    if (response.result)
      response.result.distribution = response.result.distribution
        .filter((row) => row.probability > 0)
        .slice(0, 50);
    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      id: data.id,
      error:
        error instanceof Error ? error.message : "Could not build this corpus.",
    });
  }
};

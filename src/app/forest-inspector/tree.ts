export type ForestLabel = "stay" | "play";
export type FeatureId = "outlook" | "humidity" | "wind";

export interface WeatherProfile {
  outlook: "sunny" | "overcast" | "rain";
  humidity: "high" | "normal";
  wind: "weak" | "strong";
}

export interface OutdoorPlayExample extends WeatherProfile {
  id: string;
  label: ForestLabel;
}

export type ClassCounts = [stay: number, play: number];

export interface FeatureMetadata {
  id: FeatureId;
  label: string;
  question: string;
  values: readonly string[];
}

export const FEATURE_IDS: FeatureId[] = ["outlook", "humidity", "wind"];

export const FEATURE_METADATA: Record<FeatureId, FeatureMetadata> = {
  outlook: {
    id: "outlook",
    label: "Outlook",
    question: "What does the sky look like?",
    values: ["sunny", "overcast", "rain"],
  },
  humidity: {
    id: "humidity",
    label: "Humidity",
    question: "Is the air high or normal humidity?",
    values: ["high", "normal"],
  },
  wind: {
    id: "wind",
    label: "Wind",
    question: "Is the wind weak or strong?",
    values: ["weak", "strong"],
  },
};

export const OUTCOME_LABELS: Record<ForestLabel, string> = {
  stay: "Stay in",
  play: "Play outside",
};

export const OUTCOME_SHORT_LABELS: Record<ForestLabel, string> = {
  stay: "Stay",
  play: "Play",
};

const OUTDOOR_PLAY_ROWS: Array<Omit<OutdoorPlayExample, "id">> = [
  { outlook: "sunny", humidity: "high", wind: "weak", label: "stay" },
  { outlook: "sunny", humidity: "high", wind: "strong", label: "stay" },
  { outlook: "overcast", humidity: "high", wind: "weak", label: "play" },
  { outlook: "rain", humidity: "high", wind: "weak", label: "play" },
  { outlook: "rain", humidity: "normal", wind: "weak", label: "play" },
  { outlook: "rain", humidity: "normal", wind: "strong", label: "stay" },
  { outlook: "overcast", humidity: "normal", wind: "strong", label: "play" },
  { outlook: "sunny", humidity: "high", wind: "weak", label: "stay" },
  { outlook: "sunny", humidity: "normal", wind: "weak", label: "play" },
  { outlook: "rain", humidity: "normal", wind: "weak", label: "play" },
  { outlook: "sunny", humidity: "normal", wind: "strong", label: "play" },
  { outlook: "overcast", humidity: "high", wind: "strong", label: "play" },
  { outlook: "overcast", humidity: "normal", wind: "weak", label: "play" },
  { outlook: "rain", humidity: "high", wind: "strong", label: "stay" },
];

export interface CategoricalGroup {
  value: string;
  samples: number;
  counts: ClassCounts;
  entropy: number;
  weightedEntropy: number;
}

export interface SplitCandidate {
  feature: FeatureId;
  gain: number;
  parentEntropy: number;
  weightedEntropy: number;
  groups: CategoricalGroup[];
}

export interface LeafNode {
  kind: "leaf";
  samples: number;
  counts: ClassCounts;
  entropy: number;
  prediction: ForestLabel;
}

export interface SplitNode {
  kind: "split";
  samples: number;
  counts: ClassCounts;
  entropy: number;
  prediction: ForestLabel;
  feature: FeatureId;
  gain: number;
  branches: Partial<Record<string, TreeNode>>;
}

export type TreeNode = LeafNode | SplitNode;

export interface ForestModel {
  trees: TreeNode[];
  samplesPerTree: OutdoorPlayExample[][];
  featuresPerSplit: number;
}

export interface TreeTraceStep {
  feature: FeatureId;
  value: string;
  gain: number;
  usedFallback: boolean;
}

export interface TreeTrace {
  steps: TreeTraceStep[];
  prediction: ForestLabel;
  usedFallback: boolean;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function labelIndex(label: ForestLabel): 0 | 1 {
  return label === "stay" ? 0 : 1;
}

function majorityClass(counts: ClassCounts): ForestLabel {
  return counts[1] > counts[0] ? "play" : "stay";
}

function clampPositiveInteger(value: number, fallback: number): number {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : fallback));
}

export function createOutdoorPlayDataset(): OutdoorPlayExample[] {
  return OUTDOOR_PLAY_ROWS.map((row, index) => ({ id: `day-${index + 1}`, ...row }));
}

export function getFeatureValue(profile: WeatherProfile, feature: FeatureId): string {
  return profile[feature];
}

export function classCounts(rows: OutdoorPlayExample[]): ClassCounts {
  return rows.reduce<ClassCounts>(
    (counts, row) => {
      counts[labelIndex(row.label)] += 1;
      return counts;
    },
    [0, 0],
  );
}

export function entropyFromCounts(counts: ClassCounts): number {
  const total = counts[0] + counts[1];
  if (total === 0) return 0;
  return counts.reduce((entropy, count) => {
    if (count === 0) return entropy;
    const probability = count / total;
    return entropy - probability * Math.log2(probability);
  }, 0);
}

export function entropy(rows: OutdoorPlayExample[]): number {
  return entropyFromCounts(classCounts(rows));
}

export function partitionByFeature(
  rows: OutdoorPlayExample[],
  feature: FeatureId,
): CategoricalGroup[] {
  return FEATURE_METADATA[feature].values
    .map((value) => {
      const groupRows = rows.filter((row) => getFeatureValue(row, feature) === value);
      const counts = classCounts(groupRows);
      const groupEntropy = entropyFromCounts(counts);
      return {
        value,
        samples: groupRows.length,
        counts,
        entropy: groupEntropy,
        weightedEntropy: rows.length === 0 ? 0 : (groupRows.length / rows.length) * groupEntropy,
      };
    })
    .filter((group) => group.samples > 0);
}

export function findSplitCandidates(
  rows: OutdoorPlayExample[],
  features: FeatureId[] = FEATURE_IDS,
): SplitCandidate[] {
  if (rows.length < 2) return [];

  const parentEntropy = entropy(rows);
  const candidates = features.flatMap((feature) => {
    const groups = partitionByFeature(rows, feature);
    if (groups.length < 2) return [];
    const weightedEntropy = groups.reduce((total, group) => total + group.weightedEntropy, 0);
    return [{ feature, gain: parentEntropy - weightedEntropy, parentEntropy, weightedEntropy, groups }];
  });

  return candidates.sort(
    (left, right) => right.gain - left.gain || FEATURE_IDS.indexOf(left.feature) - FEATURE_IDS.indexOf(right.feature),
  );
}

function buildTreeInternal(
  rows: OutdoorPlayExample[],
  remainingFeatures: FeatureId[],
  maxDepth: number,
  depth: number,
  chooseFeatures: (features: FeatureId[]) => FeatureId[],
): TreeNode {
  const counts = classCounts(rows);
  const nodeEntropy = entropyFromCounts(counts);
  const prediction = majorityClass(counts);

  if (depth >= maxDepth || nodeEntropy === 0 || rows.length < 2 || remainingFeatures.length === 0) {
    return { kind: "leaf", samples: rows.length, counts, entropy: nodeEntropy, prediction };
  }

  const candidateFeatures = chooseFeatures(remainingFeatures).filter((feature) => remainingFeatures.includes(feature));
  const [best] = findSplitCandidates(rows, candidateFeatures);
  if (!best || best.gain <= 0) {
    return { kind: "leaf", samples: rows.length, counts, entropy: nodeEntropy, prediction };
  }

  const nextFeatures = remainingFeatures.filter((feature) => feature !== best.feature);
  const branches: Partial<Record<string, TreeNode>> = {};
  for (const group of best.groups) {
    const branchRows = rows.filter((row) => getFeatureValue(row, best.feature) === group.value);
    branches[group.value] = buildTreeInternal(branchRows, nextFeatures, maxDepth, depth + 1, chooseFeatures);
  }

  return {
    kind: "split",
    samples: rows.length,
    counts,
    entropy: nodeEntropy,
    prediction,
    feature: best.feature,
    gain: best.gain,
    branches,
  };
}

export function buildDecisionTree(rows: OutdoorPlayExample[], maxDepth = 2): TreeNode {
  return buildTreeInternal(rows, FEATURE_IDS, clampPositiveInteger(maxDepth, 2), 0, (features) => features);
}

function chooseRandomFeatures(
  features: FeatureId[],
  count: number,
  random: () => number,
): FeatureId[] {
  const pool = [...features];
  const chosen: FeatureId[] = [];
  const target = Math.min(pool.length, clampPositiveInteger(count, 1));

  while (chosen.length < target) {
    const index = Math.floor(random() * pool.length);
    chosen.push(pool[index]);
    pool.splice(index, 1);
  }
  return chosen;
}

export function buildRandomForest(
  rows: OutdoorPlayExample[],
  treeCount = 11,
  maxDepth = 2,
  featuresPerSplit = 2,
): ForestModel {
  const safeTreeCount = clampPositiveInteger(treeCount, 11);
  const safeDepth = clampPositiveInteger(maxDepth, 2);
  const safeFeaturesPerSplit = Math.min(FEATURE_IDS.length, clampPositiveInteger(featuresPerSplit, 2));
  const random = seededRandom(2027 + rows.length * 17 + safeTreeCount * 31 + safeDepth * 7 + safeFeaturesPerSplit);
  const trees: TreeNode[] = [];
  const samplesPerTree: OutdoorPlayExample[][] = [];

  for (let treeIndex = 0; treeIndex < safeTreeCount; treeIndex++) {
    const sample = Array.from({ length: rows.length }, () => rows[Math.floor(random() * rows.length)]);
    samplesPerTree.push(sample);
    trees.push(
      buildTreeInternal(sample, FEATURE_IDS, safeDepth, 0, (features) =>
        chooseRandomFeatures(features, safeFeaturesPerSplit, random),
      ),
    );
  }

  return { trees, samplesPerTree, featuresPerSplit: safeFeaturesPerSplit };
}

export function predictTree(tree: TreeNode, profile: WeatherProfile): ForestLabel {
  if (tree.kind === "leaf") return tree.prediction;
  const branch = tree.branches[getFeatureValue(profile, tree.feature)];
  return branch ? predictTree(branch, profile) : tree.prediction;
}

export function traceTree(tree: TreeNode, profile: WeatherProfile): TreeTrace {
  const steps: TreeTraceStep[] = [];
  let current = tree;

  while (current.kind === "split") {
    const value = getFeatureValue(profile, current.feature);
    const branch = current.branches[value];
    const usedFallback = !branch;
    steps.push({ feature: current.feature, value, gain: current.gain, usedFallback });
    if (!branch) return { steps, prediction: current.prediction, usedFallback: true };
    current = branch;
  }

  return { steps, prediction: current.prediction, usedFallback: false };
}

export function forestVotes(forest: ForestModel, profile: WeatherProfile): ForestLabel[] {
  return forest.trees.map((tree) => predictTree(tree, profile));
}

export function forestProbability(forest: ForestModel, profile: WeatherProfile): number {
  if (forest.trees.length === 0) return 0;
  return forestVotes(forest, profile).filter((vote) => vote === "play").length / forest.trees.length;
}

export function treeHeight(node: TreeNode): number {
  if (node.kind === "leaf") return 1;
  const branchHeights = Object.values(node.branches)
    .filter((branch): branch is TreeNode => Boolean(branch))
    .map((branch) => treeHeight(branch));
  return 1 + Math.max(0, ...branchHeights);
}

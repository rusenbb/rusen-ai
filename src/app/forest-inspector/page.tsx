"use client";

import { useMemo, useState } from "react";

import { Button, DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  FEATURE_IDS,
  FEATURE_METADATA,
  OUTCOME_LABELS,
  OUTCOME_SHORT_LABELS,
  buildDecisionTree,
  buildRandomForest,
  createOutdoorPlayDataset,
  findSplitCandidates,
  forestVotes,
  traceTree,
  type FeatureId,
  type ForestLabel,
  type ForestModel,
  type OutdoorPlayExample,
  type SplitCandidate,
  type TreeTrace,
  type WeatherProfile,
} from "./tree";

const FOREST_SIZES = [5, 11, 21];

function format(value: number, digits = 3): string {
  return value.toFixed(digits);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function OutcomeBadge({ outcome, compact = false }: { outcome: ForestLabel; compact?: boolean }) {
  const colors = outcome === "play"
    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-800 dark:text-cyan-200"
    : "border-amber-400/60 bg-amber-400/10 text-amber-800 dark:text-amber-200";

  return (
    <span className={`inline-flex items-center border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.11em] ${colors}`}>
      {compact ? OUTCOME_SHORT_LABELS[outcome] : OUTCOME_LABELS[outcome]}
    </span>
  );
}

function CandidateInspector({
  candidate,
  isWinner,
}: {
  candidate: SplitCandidate;
  isWinner: boolean;
}) {
  const feature = FEATURE_METADATA[candidate.feature];

  return (
    <div className="border-t border-[var(--line)] pt-4" data-allow-select>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">If we ask {feature.label}</p>
          <p className="mt-1 text-sm font-semibold">{feature.question}</p>
        </div>
        <span className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.11em] ${isWinner ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-800 dark:text-cyan-200" : "border-[var(--line)] text-neutral-500"}`}>
          {isWinner ? "tree chooses this" : "compare this split"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {candidate.groups.map((group) => (
          <div key={group.value} className="border border-[var(--line)] p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-mono text-sm font-bold">{titleCase(group.value)}</p>
              <span className="text-xs text-neutral-500">{group.samples} days</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="text-amber-700 dark:text-amber-300">{group.counts[0]} stay</span>
              <span className="text-cyan-700 dark:text-cyan-300">{group.counts[1]} play</span>
            </div>
            <p className="mt-3 font-mono text-xs text-neutral-500">uncertainty H = {format(group.entropy)}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        H before {format(candidate.parentEntropy)} minus H after {format(candidate.weightedEntropy)} gives information gain <strong className="font-mono text-foreground">{format(candidate.gain)}</strong>.
      </p>
    </div>
  );
}

function WeatherProfileControl({
  profile,
  onChange,
}: {
  profile: WeatherProfile;
  onChange: (feature: FeatureId, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {FEATURE_IDS.map((feature) => {
        const metadata = FEATURE_METADATA[feature];
        return (
          <div key={feature}>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">{metadata.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {metadata.values.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={profile[feature] === value ? "primary" : "secondary"}
                  onClick={() => onChange(feature, value)}
                  title={`${metadata.label}: ${titleCase(value)}`}
                >
                  {titleCase(value)}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DecisionPath({ trace }: { trace: TreeTrace }) {
  return (
    <div className="space-y-3">
      {trace.steps.map((step, index) => (
        <div key={`${step.feature}-${index}`} className="flex gap-3 border border-[var(--line)] p-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-foreground font-mono text-xs font-bold">{index + 1}</span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-neutral-500">Ask {FEATURE_METADATA[step.feature].label}</p>
            <p className="mt-1 text-sm font-semibold">Today is <strong>{titleCase(step.value)}</strong>, so take the {titleCase(step.value)} branch.</p>
            <p className="mt-1 text-xs text-neutral-500">This node removes {format(step.gain)} uncertainty.</p>
            {step.usedFallback ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">This branch was absent, so the tree falls back to its local majority.</p> : null}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-foreground bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] p-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">One tree concludes</p>
          <p className="mt-1 text-lg font-bold">{OUTCOME_LABELS[trace.prediction]}</p>
        </div>
        <OutcomeBadge outcome={trace.prediction} />
      </div>
    </div>
  );
}

function ForestVoteStrip({
  forest,
  votes,
  singlePrediction,
}: {
  forest: ForestModel;
  votes: ForestLabel[];
  singlePrediction: ForestLabel;
}) {
  const playVotes = votes.filter((vote) => vote === "play").length;
  const stayVotes = votes.length - playVotes;
  const prediction: ForestLabel = playVotes > stayVotes ? "play" : "stay";
  const disagreeingVotes = votes.filter((vote) => vote !== singlePrediction).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 lg:grid-cols-11">
        {votes.map((vote, index) => {
          const root = forest.trees[index].kind === "split" ? FEATURE_METADATA[forest.trees[index].feature].label : "Leaf";
          const colors = vote === "play"
            ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-800 dark:text-cyan-200"
            : "border-amber-400/60 bg-amber-400/10 text-amber-800 dark:text-amber-200";
          return (
            <div key={index} className={`min-w-0 border px-1 py-2 text-center font-mono ${colors}`} title={`Tree ${index + 1}. Root question: ${root}. Vote: ${OUTCOME_SHORT_LABELS[vote]}.`}>
              <p className="text-[9px] uppercase tracking-[0.1em] opacity-70">{index + 1}</p>
              <p className="mt-1 text-[10px] font-bold">{OUTCOME_SHORT_LABELS[vote]}</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">Forest consensus</p>
          <p className="mt-1 text-lg font-bold">{stayVotes} stay, {playVotes} play</p>
        </div>
        <OutcomeBadge outcome={prediction} />
      </div>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        Each tile is a tree trained on a bootstrap sample of the same 14 days, considering up to {forest.featuresPerSplit} of 3 available questions at each split. {disagreeingVotes > 0 ? `${disagreeingVotes} tree${disagreeingVotes === 1 ? "" : "s"} disagree${disagreeingVotes === 1 ? "s" : ""} with the single-tree path, so the vote softens one quirky resample.` : "These resamples agree for this profile."} A vote is consensus, not proof.
      </p>
    </div>
  );
}

function OutdoorPlayTable({ rows, profile }: { rows: OutdoorPlayExample[]; profile: WeatherProfile }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[38rem] border-collapse text-left text-xs">
        <thead className="border-b border-[var(--line)] font-mono uppercase tracking-[0.1em] text-neutral-500">
          <tr>
            <th className="py-2 pr-3">day</th>
            <th className="py-2 pr-3">outlook</th>
            <th className="py-2 pr-3">humidity</th>
            <th className="py-2 pr-3">wind</th>
            <th className="py-2">outcome</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const matchesProfile = row.outlook === profile.outlook && row.humidity === profile.humidity && row.wind === profile.wind;
            return (
              <tr key={row.id} className={`border-b border-[var(--line)] last:border-0 ${matchesProfile ? "bg-[color-mix(in_srgb,var(--signal)_9%,transparent)]" : ""}`}>
                <td className="py-2.5 pr-3 font-mono text-neutral-500">{index + 1}</td>
                <td className="py-2.5 pr-3">{titleCase(row.outlook)}</td>
                <td className="py-2.5 pr-3">{titleCase(row.humidity)}</td>
                <td className="py-2.5 pr-3">{titleCase(row.wind)}</td>
                <td className="py-2.5"><OutcomeBadge outcome={row.label} compact /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ForestInspectorPage() {
  const rows = useMemo(() => createOutdoorPlayDataset(), []);
  const [inspectedFeature, setInspectedFeature] = useState<FeatureId>("outlook");
  const [profile, setProfile] = useState<WeatherProfile>({ outlook: "sunny", humidity: "high", wind: "weak" });
  const [depth, setDepth] = useState(2);
  const [treeCount, setTreeCount] = useState(11);

  const candidates = useMemo(() => findSplitCandidates(rows), [rows]);
  const tree = useMemo(() => buildDecisionTree(rows, depth), [depth, rows]);
  const forest = useMemo(() => buildRandomForest(rows, treeCount, depth, 2), [depth, rows, treeCount]);
  const inspectedCandidate = candidates.find((candidate) => candidate.feature === inspectedFeature) ?? candidates[0];
  const rootFeature = tree.kind === "split" ? tree.feature : null;
  const trace = traceTree(tree, profile);
  const votes = forestVotes(forest, profile);

  const updateProfile = (feature: FeatureId, value: string) => {
    setProfile((current) => ({ ...current, [feature]: value }) as WeatherProfile);
  };

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Interpretable ML / split, inspect, vote"
        title="Forest Inspector"
        description="A tree chooses the categorical question that makes its examples less mixed. Pick a weather profile, follow one transparent path, then see how several resampled trees vote."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <DemoPanel title="1. Inspect a possible first question" description="Information gain measures how much a question turns a mixed set of days into cleaner groups. Try each candidate, then compare its score.">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {FEATURE_IDS.map((feature) => (
                <Button key={feature} type="button" size="sm" variant={inspectedFeature === feature ? "primary" : "secondary"} onClick={() => setInspectedFeature(feature)} title={FEATURE_METADATA[feature].question}>
                  {FEATURE_METADATA[feature].label}
                </Button>
              ))}
            </div>
            {inspectedCandidate ? <CandidateInspector candidate={inspectedCandidate} isWinner={inspectedCandidate.feature === rootFeature} /> : null}
          </div>
        </DemoPanel>

        <DemoPanel title="2. Describe today" description="These are categorical dials, not numeric coordinates. Change one fact and the tree path changes with it.">
          <div className="space-y-5">
            <WeatherProfileControl profile={profile} onChange={updateProfile} />
            <div className="border-y border-[var(--line)] py-4">
              <label className="block">
                <span className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.13em]"><span>Maximum questions per tree</span><strong className="text-lg">{depth}</strong></span>
                <input aria-label="Maximum questions per tree" className="mt-3 w-full accent-foreground" type="range" min="1" max="3" value={depth} onChange={(event) => setDepth(Number(event.target.value))} />
                <p className="mt-2 text-xs text-neutral-500">{depth === 1 ? "Depth 1 shows only the first question." : `Depth ${depth} keeps the explanation short while leaving room for a follow-up question.`}</p>
              </label>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">Forest size</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FOREST_SIZES.map((size) => <Button key={size} type="button" size="sm" variant={treeCount === size ? "primary" : "secondary"} onClick={() => setTreeCount(size)}>{size} trees</Button>)}
              </div>
            </div>
          </div>
        </DemoPanel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <DemoPanel title="3. Follow one tree" description="The selected day takes one visible branch at a time. This is the exact categorical route the single decision tree uses.">
          <DecisionPath trace={trace} />
        </DemoPanel>
        <DemoPanel title="4. Let the forest vote" description="A forest does not make the single tree more complicated. It asks several slightly different trees for a vote.">
          <ForestVoteStrip forest={forest} votes={votes} singlePrediction={trace.prediction} />
        </DemoPanel>
      </div>

      <section className="mt-5" aria-labelledby="outdoor-play-data">
        <DemoPanel className="min-w-0" title="The 14 observed days" description="The highlighted rows have the exact profile selected above. This is all the data the root information-gain calculation sees.">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 sm:hidden">Swipe the table to see all columns</p>
          <OutdoorPlayTable rows={rows} profile={profile} />
        </DemoPanel>
      </section>
      <DemoFootnote>
        This compact categorical teaching table is adapted from the classic outdoor-play example. Every entropy value, split, bootstrap sample, and vote is computed in this page; it is not a weather recommendation system.
      </DemoFootnote>
    </DemoPage>
  );
}

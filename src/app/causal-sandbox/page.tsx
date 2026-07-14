"use client";

import { useMemo, useState } from "react";

import { DemoFootnote, DemoHeader, DemoPage, DemoPanel } from "@/components/ui";

import {
  createUmbrellaWorld,
  summarizeUmbrellaWorld,
  type UmbrellaSummary,
} from "./math";

const CROWD_SIZE = 10;

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function signedPoints(value: number): string {
  const points = Math.round(value * 100);
  return `${points >= 0 ? "+" : ""}${points} pp`;
}

function WeatherPerson({ rainy }: { rainy: boolean }) {
  return (
    <svg
      viewBox="0 0 34 42"
      className="h-9 w-7"
      aria-hidden="true"
      focusable="false"
    >
      {rainy ? (
        <>
          <path d="M6 8c1.6-3.8 4.8-5.7 8.1-5.7 3.7 0 5.5 1.8 6.7 4.2 3.6-.4 6.3 2 6.3 5.3 0 3.1-2.5 5.2-5.8 5.2H8.4C4.9 17 3 14.8 3 12.1 3 10.2 4.2 8.8 6 8Z" className="fill-cyan-500/25 stroke-cyan-500" strokeWidth="1.25" />
          <path d="M9 19.5 7.5 23M17 19.5 15.5 23M25 19.5 23.5 23" className="stroke-cyan-500" strokeLinecap="round" strokeWidth="1.7" />
        </>
      ) : (
        <>
          <circle cx="17" cy="9" r="4.6" className="fill-amber-400/25 stroke-amber-500" strokeWidth="1.2" />
          <path d="M17 1v2M17 15v2M9 9h2M23 9h2M11.4 3.4l1.4 1.4M21.2 13.2l1.4 1.4M22.6 3.4l-1.4 1.4M12.8 13.2l-1.4 1.4" className="stroke-amber-500" strokeLinecap="round" strokeWidth="1.25" />
        </>
      )}
      <circle cx="17" cy="25" r="4.2" className={rainy ? "fill-cyan-500/25 stroke-cyan-600 dark:stroke-cyan-300" : "fill-amber-500/20 stroke-amber-600 dark:stroke-amber-300"} strokeWidth="1.25" />
      <path d="M10.6 38c.6-5.2 3.3-7.8 6.4-7.8s5.8 2.6 6.4 7.8" className={rainy ? "fill-cyan-500/18 stroke-cyan-600 dark:stroke-cyan-300" : "fill-amber-500/16 stroke-amber-600 dark:stroke-amber-300"} strokeWidth="1.25" />
    </svg>
  );
}

function WeatherCrowd({ rainyRate }: { rainyRate: number }) {
  const rainyPeople = Math.round(rainyRate * CROWD_SIZE);
  return (
    <div>
      <div
        role="img"
        aria-label={`A rounded ten-person weather mix with ${percent(rainyRate)} rain`}
        className="grid grid-cols-5 justify-items-center gap-x-1 gap-y-1 border-y border-[var(--line)] py-3"
      >
        {Array.from({ length: CROWD_SIZE }, (_, index) => (
          <WeatherPerson key={index} rainy={index < rainyPeople} />
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">
        weather mix: {percent(rainyRate)} rain
      </p>
    </div>
  );
}

function WetShoeMeter({ value }: { value: number }) {
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500">wet shoes</span>
        <strong className="font-mono text-lg tabular-nums text-fuchsia-700 dark:text-fuchsia-300">{percent(value)}</strong>
      </div>
      <div className="mt-1.5 h-2 bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]">
        <div className="h-full bg-fuchsia-500 transition-[width] duration-300" style={{ width: percent(value) }} />
      </div>
    </div>
  );
}

function Group({
  label,
  detail,
  rainyRate,
  wetShoeRate,
  tone,
}: {
  label: string;
  detail: string;
  rainyRate: number;
  wetShoeRate: number;
  tone: "cyan" | "amber";
}) {
  const toneClass = tone === "cyan"
    ? "border-cyan-500/35 bg-cyan-500/[0.035]"
    : "border-amber-500/35 bg-amber-500/[0.035]";

  return (
    <section className={`border p-3 sm:p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.1em] text-neutral-800 dark:text-neutral-100">{label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{detail}</p>
        </div>
        <span className={`mt-0.5 size-2 shrink-0 rounded-full ${tone === "cyan" ? "bg-cyan-500" : "bg-amber-500"}`} aria-hidden="true" />
      </div>
      <WeatherCrowd rainyRate={rainyRate} />
      <WetShoeMeter value={wetShoeRate} />
    </section>
  );
}

function World({
  kind,
  summary,
  rainRate,
}: {
  kind: "observed" | "forced";
  summary: UmbrellaSummary;
  rainRate: number;
}) {
  const observed = kind === "observed";
  const withoutUmbrellaRain = observed
    ? summary.rainAmongPeopleWithoutUmbrella
    : rainRate;
  const withUmbrellaRain = observed
    ? summary.rainAmongPeopleWithUmbrella
    : rainRate;
  const withoutUmbrellaWetShoes = observed
    ? summary.observedWetWithoutUmbrella
    : summary.forcedWetWithoutUmbrella;
  const withUmbrellaWetShoes = observed
    ? summary.observedWetWithUmbrella
    : summary.forcedWetWithUmbrella;
  const difference = observed ? summary.observedAssociation : summary.forcedEffect;
  const groupsStartDifferently = Math.abs(
    summary.rainAmongPeopleWithUmbrella - summary.rainAmongPeopleWithoutUmbrella,
  ) > 0.005;

  return (
    <DemoPanel
      title={observed ? "1. Let people choose" : "2. Hand umbrellas out by coin flip"}
      description={observed
        ? groupsStartDifferently
          ? "Rain changes who carries an umbrella, so the two groups begin with different weather."
          : "At this setting, rain does not change who carries an umbrella, so the groups begin alike."
        : "The coin flip does not know the weather, so both groups begin with the same weather mix."}
      padding="md"
      className={observed ? "border-cyan-500/45" : "border-emerald-500/45"}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Group
          label="No umbrella"
          detail={observed ? "starting weather mix" : "same weather mix"}
          rainyRate={withoutUmbrellaRain}
          wetShoeRate={withoutUmbrellaWetShoes}
          tone="amber"
        />
        <Group
          label="Has umbrella"
          detail={observed ? "starting weather mix" : "same weather mix"}
          rainyRate={withUmbrellaRain}
          wetShoeRate={withUmbrellaWetShoes}
          tone="cyan"
        />
      </div>
      <div className={`mt-4 border p-3 ${observed ? "border-cyan-500/35 bg-cyan-500/[0.055]" : "border-emerald-500/35 bg-emerald-500/[0.055]"}`}>
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
          {observed ? "what a raw comparison says" : "what assigning umbrellas says"}
        </span>
        <strong className={`mt-1 block font-mono text-2xl tabular-nums ${observed ? "text-cyan-700 dark:text-cyan-300" : "text-emerald-700 dark:text-emerald-300"}`}>
          {signedPoints(difference)}
        </strong>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          {observed
            ? groupsStartDifferently
              ? "Umbrellas appear to predict wetter shoes."
              : "There is no group difference to mistake for an effect."
            : "Giving an umbrella changes nothing about wet shoes."}
        </p>
      </div>
    </DemoPanel>
  );
}

export default function CausalSandboxPage() {
  const [strength, setStrength] = useState(85);
  const world = useMemo(() => createUmbrellaWorld(strength / 100), [strength]);
  const summary = useMemo(() => summarizeUmbrellaWorld(world), [world]);
  const hasSelection = strength > 0;

  return (
    <DemoPage width="2xl">
      <DemoHeader
        eyebrow="Causality / correlation is not a cause"
        title="Umbrellas and Rain"
        description="If umbrella carriers have wetter shoes, did umbrellas cause it? Turn one dial and compare what you observe with what happens when umbrellas are assigned independently of rain."
      />

      <section className="border border-[var(--line)] bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)] lg:items-end">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">The only dial</span>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">How strongly does rain decide who carries an umbrella?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">At zero, umbrella choice ignores rain. At one hundred, rain makes carrying an umbrella much more likely. Rain still remains the only cause of wet shoes in this toy world.</p>
          </div>
          <label className="block border border-cyan-500/35 bg-cyan-500/[0.045] px-4 py-3">
            <span className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.13em] text-neutral-600 dark:text-neutral-300">
              Selection strength <strong className="text-lg text-cyan-700 dark:text-cyan-300">{strength}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={strength}
              onChange={(event) => setStrength(Number(event.target.value))}
              className="mt-3 block w-full accent-cyan-500"
              aria-label="How strongly rain decides umbrella choice"
            />
            <span className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.09em] text-neutral-500"><span>choice ignores rain</span><span>choice follows rain</span></span>
          </label>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <World kind="observed" summary={summary} rainRate={world.rainRate} />
        <World kind="forced" summary={summary} rainRate={world.rainRate} />
      </div>

      <section className="mt-6 border border-fuchsia-500/45 bg-fuchsia-500/[0.055] p-5 sm:p-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-300">The click</span>
        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.42fr)] lg:items-center">
          <p className="text-xl leading-relaxed text-neutral-900 dark:text-neutral-100">
            {hasSelection
              ? "Umbrella carriers have wetter shoes because they contain more rainy days before anyone compares shoes. When umbrella assignment stops tracking rain, the apparent effect disappears."
              : "When umbrella choice does not track rain, the observed comparison and the coin-flip comparison agree. There is no association to mistake for a cause."}
          </p>
          <div className="border border-fuchsia-500/35 bg-[var(--surface)] p-4 text-right">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">umbrella effect after fair assignment</span>
            <strong className="mt-1 block font-mono text-3xl tabular-nums text-fuchsia-700 dark:text-fuchsia-300">{signedPoints(summary.forcedEffect)}</strong>
          </div>
        </div>
      </section>

      <DemoFootnote align="left">
        Each percentage is an exact expectation from a small probability model: rain changes umbrella choice and wet shoes, while umbrellas themselves do not change wet shoes. The people above are rounded weather-mix illustrations, not real observations.
      </DemoFootnote>
    </DemoPage>
  );
}

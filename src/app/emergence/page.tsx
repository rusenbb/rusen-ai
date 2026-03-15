import Link from "next/link";
import ElementaryCA from "./components/ElementaryCA";
import GameOfLifeDemo from "./components/GameOfLifeDemo";
import FireflySynchronization from "./components/FireflySynchronization";
import SchellingSegregation from "./components/SchellingSegregation";
import LangtonsAnt from "./components/LangtonsAnt";
import SandPile from "./components/SandPile";
import EmergenceSectionDirectory from "./components/EmergenceSectionDirectory";

const ESSAY_SECTIONS = [
  {
    id: "elementary-ca",
    title: "Cellular Automata",
    summary: "Tiny local rules can create randomness, fractals, or computation.",
  },
  {
    id: "game-of-life",
    title: "Game of Life",
    summary: "Simple birth-death rules can support moving structures and logic.",
  },
  {
    id: "firefly-sync",
    title: "Firefly Synchronization",
    summary: "Local flashes can pull a whole population into one shared rhythm.",
  },
  {
    id: "schelling",
    title: "Schelling",
    summary: "Mild local preferences can still create strong segregation.",
  },
  {
    id: "langtons-ant",
    title: "Langton's Ant",
    summary: "Deterministic chaos can wander for ages, then snap into order.",
  },
  {
    id: "sandpile",
    title: "SandPile",
    summary: "Slow pressure can organize a system into catastrophic sensitivity.",
  },
] as const;

export default function EmergencePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16">
      {/* Page intro */}
      <header className="mb-16 sm:mb-24">
        <p className="text-xs font-mono text-neutral-500 tracking-[0.18em] mb-3">
          AN INTERACTIVE ESSAY
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight text-balance">
          Emergence
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl text-pretty leading-relaxed">
          Simple rules, followed locally, can produce complex behavior globally
          ... behavior that nobody designed, nobody predicted, and sometimes
          nobody can fully explain. This page lets you see it happen.
        </p>

        <div className="mt-8 rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/50 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            How to read this essay
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            Move from top to bottom. The early sections show pattern formation in its purest mathematical form.
            The later sections move toward social systems, delayed order, and cascades. For each demo, look for
            three things: the local rule, the global pattern, and the moment where your intuition starts to fail.
          </p>
        </div>

        <EmergenceSectionDirectory sections={ESSAY_SECTIONS} />
      </header>

      {/* Section 1 */}
      <section id="elementary-ca" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-mono tracking-[0.22em] text-neutral-400 dark:text-neutral-500 shrink-0">01</span>
          <hr className="flex-1 border-neutral-200 dark:border-neutral-800" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl">
          We start with the smallest possible canvas: one row of cells and a lookup table.
          If emergence is real, we should be able to see it even here.
        </p>
        <ElementaryCA />
      </section>

      <div className="h-20 sm:h-28" />

      {/* Section 2 */}
      <section id="game-of-life" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-mono tracking-[0.22em] text-neutral-400 dark:text-neutral-500 shrink-0">02</span>
          <hr className="flex-1 border-neutral-200 dark:border-neutral-800" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Next, move from a line to a plane. With one extra dimension, stable structures,
          moving organisms, and computation begin to emerge from the same local logic.
        </p>
        <GameOfLifeDemo />
        <div className="mt-4">
          <Link
            href="/game-of-life"
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 underline underline-offset-4 transition"
          >
            See the full Game of Life experience &rarr;
          </Link>
        </div>
      </section>

      <div className="h-20 sm:h-28" />

      {/* Section 3 */}
      <section id="firefly-sync" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-mono tracking-[0.22em] text-neutral-400 dark:text-neutral-500 shrink-0">03</span>
          <hr className="flex-1 border-neutral-200 dark:border-neutral-800" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Keep the agents independent, but let them communicate through time.
          Order can emerge not as shape, but as a shared beat.
        </p>
        <FireflySynchronization />
      </section>

      <div className="h-20 sm:h-28" />

      {/* Section 4 */}
      <section id="schelling" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-mono tracking-[0.22em] text-neutral-400 dark:text-neutral-500 shrink-0">04</span>
          <hr className="flex-1 border-neutral-200 dark:border-neutral-800" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Now the idea leaves pure mathematics and enters social behavior.
          The rule is still local and mild. The outcome is not.
        </p>
        <SchellingSegregation />
      </section>

      <div className="h-20 sm:h-28" />

      {/* Section 5 */}
      <section id="langtons-ant" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-mono tracking-[0.22em] text-neutral-400 dark:text-neutral-500 shrink-0">05</span>
          <hr className="flex-1 border-neutral-200 dark:border-neutral-800" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Then comes a harsher lesson: some systems look chaotic for a very long time
          before they reveal any order at all.
        </p>
        <LangtonsAnt />
      </section>

      <div className="h-20 sm:h-28" />

      {/* Section 6 */}
      <section id="sandpile" className="scroll-mt-24">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-sm font-mono tracking-[0.22em] text-neutral-400 dark:text-neutral-500 shrink-0">06</span>
          <hr className="flex-1 border-neutral-200 dark:border-neutral-800" />
        </div>
        <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-2xl">
          Finally, move from pattern to shock. The same local threshold that keeps a system stable
          can also make it catastrophically sensitive.
        </p>
        <SandPile />
      </section>

      {/* Closing */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 pt-10 pb-6">
        <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed max-w-2xl">
          Six systems. Rules you can fit on an index card. Behavior that
          surprises, disturbs, and remains unexplained. Emergence is not a
          special case. It is the default. The question is not why
          complex things are complex, but why simple rules refuse to stay
          simple.
        </p>
      </footer>
    </div>
  );
}

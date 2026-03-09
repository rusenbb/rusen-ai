import Link from "next/link";
import ElementaryCA from "./components/ElementaryCA";
import GameOfLifeDemo from "./components/GameOfLifeDemo";
import SchellingSegregation from "./components/SchellingSegregation";
import LangtonsAnt from "./components/LangtonsAnt";

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
          &mdash; behavior that nobody designed, nobody predicted, and sometimes
          nobody can fully explain. This page lets you see it happen.
        </p>
      </header>

      {/* Section 1 */}
      <section className="mb-20 sm:mb-28">
        <ElementaryCA />
      </section>

      {/* Section 2 */}
      <section className="mb-20 sm:mb-28">
        <GameOfLifeDemo />
        <div className="mt-4">
          <Link
            href="/game-of-life"
            className="text-sm text-neutral-500 hover:text-neutral-300 underline underline-offset-4 transition"
          >
            See the full Game of Life experience &rarr;
          </Link>
        </div>
      </section>

      {/* Section 3 */}
      <section className="mb-20 sm:mb-28">
        <SchellingSegregation />
      </section>

      {/* Section 4 */}
      <section className="mb-20 sm:mb-28">
        <LangtonsAnt />
      </section>

      {/* Closing */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 pt-10 pb-6">
        <p className="text-neutral-500 text-sm leading-relaxed max-w-2xl">
          Four systems. Rules you can fit on an index card. Behavior that
          surprises, disturbs, and remains unexplained. Emergence is not a
          special case &mdash; it is the default. The question is not why
          complex things are complex, but why simple rules refuse to stay
          simple.
        </p>
      </footer>
    </div>
  );
}

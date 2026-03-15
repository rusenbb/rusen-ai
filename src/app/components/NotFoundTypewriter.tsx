"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PROJECTS, getProjectPath } from "@/lib/projects";

type NotFoundVariant = {
  message: string;
  homeLabel: string;
  randomLabel: string;
};

const VARIANTS: NotFoundVariant[] = [
  {
    message: "query failed",
    homeLabel: "db.root()",
    randomLabel: "db.sample()",
  },
  {
    message: "data point not found",
    homeLabel: "back to the table",
    randomLabel: "investigate a point",
  },
  {
    message: "optimizer got stuck",
    homeLabel: "escape the local minima",
    randomLabel: "random explore",
  },
  {
    message: "model hallucinated",
    homeLabel: "return to ground truth",
    randomLabel: "do not hallucinate",
  },
  {
    message: "signal lost in noise",
    homeLabel: "back to a clean signal",
    randomLabel: "let the noise win",
  },
];

const LIVE_PROJECT_PATHS = PROJECTS
  .filter((project) => project.status === "live")
  .map((project) => getProjectPath(project));

const TYPE_INTERVAL_MS = 72;

function pickRandomVariant() {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
}

function pickRandomProjectPath() {
  return LIVE_PROJECT_PATHS[Math.floor(Math.random() * LIVE_PROJECT_PATHS.length)] ?? "/";
}

export default function NotFoundTypewriter() {
  const router = useRouter();
  const [variant, setVariant] = useState<NotFoundVariant | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const message = variant?.message ?? "";

  useEffect(() => {
    const mountTimeout = window.setTimeout(() => {
      setVariant(pickRandomVariant());
    }, 0);

    return () => window.clearTimeout(mountTimeout);
  }, []);

  useEffect(() => {
    if (!variant) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      const reducedMotionTimeout = window.setTimeout(() => {
        setVisibleCount(message.length);
      }, 0);

      return () => window.clearTimeout(reducedMotionTimeout);
    }

    const typeInterval = window.setInterval(() => {
      setVisibleCount((current) => {
        if (current >= message.length) {
          window.clearInterval(typeInterval);
          return current;
        }

        return current + 1;
      });
    }, TYPE_INTERVAL_MS);

    return () => window.clearInterval(typeInterval);
  }, [message, variant]);

  useEffect(() => {
    const blinkInterval = window.setInterval(() => {
      setCursorVisible((current) => !current);
    }, 530);

    return () => window.clearInterval(blinkInterval);
  }, []);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
      {variant ? (
        <div className="flex flex-col items-center gap-10">
          <p className="pointer-events-none font-mono text-lg tracking-[0.14em] text-neutral-700 dark:text-neutral-200 sm:text-2xl">
            {message.slice(0, visibleCount)}
            <span
              aria-hidden="true"
              className={`ml-1 inline-block h-[1.1em] w-[0.08em] align-[-0.16em] bg-current transition-opacity ${
                cursorVisible ? "opacity-100" : "opacity-0"
              }`}
            />
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-2 font-mono text-xs tracking-[0.12em] sm:text-sm">
            <Link
              href="/"
              className="pointer-events-auto text-neutral-600 underline decoration-neutral-400 underline-offset-[0.32em] transition hover:text-neutral-950 hover:decoration-neutral-700 dark:text-neutral-300 dark:decoration-neutral-600 dark:hover:text-neutral-50 dark:hover:decoration-neutral-300"
            >
              {variant.homeLabel}
            </Link>
            <button
              type="button"
              onClick={() => router.push(pickRandomProjectPath())}
              className="pointer-events-auto text-neutral-600 underline decoration-neutral-400 underline-offset-[0.32em] transition hover:text-neutral-950 hover:decoration-neutral-700 dark:text-neutral-300 dark:decoration-neutral-600 dark:hover:text-neutral-50 dark:hover:decoration-neutral-300"
            >
              {variant.randomLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

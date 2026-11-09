"use client";

import { DemoHeader, DemoPage } from "@/components/ui";

import { CryptoHero, IssFeed, QuakeFeed, SOURCES, WikiFeed } from "./widgets";

export default function PulseBoardPage() {
  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Live data"
        title="Pulse Board"
        description="Four public feeds arrive in your browser as they change: crypto trades, the space station's position, earthquakes and Wikipedia edits."
      />

      <CryptoHero />

      <div className="mt-10 grid gap-8 border-t border-[var(--line)] pt-6 md:grid-cols-3">
        <IssFeed />
        <QuakeFeed />
        <WikiFeed />
      </div>

      <p className="mt-10 text-xs text-[var(--sub)]">
        Sources:{" "}
        {SOURCES.map((source, index) => (
          <span key={source.label}>
            {index > 0 ? ", " : null}
            <a href={source.href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
              {source.label}
            </a>
          </span>
        ))}
        .
      </p>
    </DemoPage>
  );
}

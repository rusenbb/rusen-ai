"use client";

import { DemoHeader, DemoPage } from "@/components/ui";

import { CryptoHero, IssFeed, LiveMap, QuakeFeed, SOURCES, WikiFeed, useIss, useQuakes } from "./widgets";

export default function PulseBoardPage() {
  const iss = useIss();
  const quakes = useQuakes();
  return (
    <DemoPage>
      <DemoHeader
        eyebrow="Live data"
        title="Pulse Board"
        description="Four public feeds arrive in your browser as they change: crypto trades, the space station's position, earthquakes and Wikipedia edits."
      />

      <CryptoHero />

      <div className="mt-10 border-t border-[var(--line)] pt-6">
        <LiveMap iss={iss} feed={quakes} />
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <IssFeed iss={iss} />
        <QuakeFeed feed={quakes} />
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

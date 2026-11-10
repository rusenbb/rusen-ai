"use client";

import { useSyncExternalStore } from "react";
import { getPalette, nextPalette, setPalettePreference, subscribePalette, type Palette } from "./theme";
import NavWord from "./NavWord";
import { useHydrated } from "./useHydrated";

export default function PaletteToggle({ label }: { label: string }) {
  const hydrated = useHydrated();
  const palette = useSyncExternalStore<Palette>(subscribePalette, getPalette, () => "default");
  const next = nextPalette(palette);

  return (
    <button
      type="button"
      disabled={!hydrated}
      onClick={() => setPalettePreference(nextPalette(getPalette()))}
      aria-label={`Switch to the ${next} palette`}
      title={`Switch to the ${next} palette`}
      className="theme-toggle group inline-flex items-center justify-center self-center font-mono leading-none text-foreground transition hover:text-foreground"
    >
      <NavWord word={`${label}: ${palette}`} preserveCase />
      <span className="sr-only">Current palette: {palette}</span>
    </button>
  );
}

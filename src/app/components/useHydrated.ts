"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Keep controls disabled until their client event handlers are attached. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

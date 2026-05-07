import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "·",
  description: "·",
  robots: { index: false, follow: false },
};

export default function GardenOfLoveLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

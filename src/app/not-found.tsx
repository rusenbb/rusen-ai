import type { Metadata } from "next";
import NotFoundExperience from "./components/NotFoundExperience";

export const metadata: Metadata = {
  title: "Page not found | Rusen.ai",
  description: "The requested page could not be found.",
  robots: { index: false, follow: false },
  openGraph: null,
  twitter: null,
  alternates: {},
};

export default function NotFound() {
  return <NotFoundExperience />;
}

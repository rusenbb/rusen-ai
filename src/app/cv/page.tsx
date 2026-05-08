import type { Metadata } from "next";
import { getCvData, getCvLabels } from "@/lib/cv";
import CVDocument from "./CVDocument";

export const metadata: Metadata = {
  title: "CV | Rusen.ai",
  description: "Curriculum vitae of Rusen Birben, AI & Data Engineer.",
  alternates: {
    canonical: "/cv",
    languages: {
      en: "/cv",
      tr: "/cv/tr",
      ja: "/cv/ja",
    },
  },
};

export default function CVPage() {
  return (
    <CVDocument
      cv={getCvData("en")}
      labels={getCvLabels("en")}
      locale="en"
      outputBase="cv"
    />
  );
}

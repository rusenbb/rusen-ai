import type { Metadata } from "next";
import { getCvData, getCvLabels } from "@/lib/cv";
import CVDocument from "../CVDocument";

export const metadata: Metadata = {
  title: "履歴書 | Rusen.ai",
  description: "Rusen Birben の履歴書 — AI・データエンジニア。",
  alternates: {
    canonical: "/cv/ja",
    languages: {
      en: "/cv",
      tr: "/cv/tr",
      ja: "/cv/ja",
    },
  },
};

export default function CVPageJa() {
  return (
    <CVDocument
      cv={getCvData("ja")}
      labels={getCvLabels("ja")}
      locale="ja"
      outputBase="cv.ja"
    />
  );
}

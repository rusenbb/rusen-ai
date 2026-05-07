import type { Metadata } from "next";
import { getCvData, getCvLabels } from "@/lib/cv";
import CVDocument from "../CVDocument";

export const metadata: Metadata = {
  title: "Özgeçmiş | Rusen.ai",
  description: "Rusen Birben'in özgeçmişi — Yapay Zeka ve Veri Mühendisi.",
  alternates: {
    canonical: "/cv/tr",
    languages: {
      en: "/cv",
      tr: "/cv/tr",
    },
  },
};

export default function CVPageTr() {
  return (
    <CVDocument
      cv={getCvData("tr")}
      labels={getCvLabels("tr")}
      locale="tr"
      outputBase="cv.tr"
    />
  );
}

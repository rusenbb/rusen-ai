import type { Metadata } from "next";
import { getCvData, getCvLabels } from "@/lib/cv";
import { buildStaticPageMetadata } from "@/lib/social-metadata";
import CVDocument from "../CVDocument";

export const metadata: Metadata = buildStaticPageMetadata("cvTr", {
  en: "/cv",
  tr: "/cv/tr",
  ja: "/cv/ja",
});

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

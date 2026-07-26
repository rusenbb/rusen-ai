import type { Metadata } from "next";
import { getCvData, getCvLabels } from "@/lib/cv";
import { buildStaticPageMetadata } from "@/lib/social-metadata";
import CVDocument from "../CVDocument";

export const metadata: Metadata = buildStaticPageMetadata("cvJa", {
  en: "/cv",
  tr: "/cv/tr",
  ja: "/cv/ja",
});

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

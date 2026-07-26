import type { Metadata } from "next";
import { getCvData, getCvLabels } from "@/lib/cv";
import { buildStaticPageMetadata } from "@/lib/social-metadata";
import CVDocument from "./CVDocument";

export const metadata: Metadata = buildStaticPageMetadata("cv", {
  en: "/cv",
  tr: "/cv/tr",
  ja: "/cv/ja",
});

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

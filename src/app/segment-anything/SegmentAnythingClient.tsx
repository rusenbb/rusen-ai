"use client";

import dynamic from "next/dynamic";
import { DemoHeader, DemoPage } from "@/components/ui";

const SegmentAnythingExperience = dynamic(() => import("./SegmentAnythingExperience"), {
  ssr: false,
  loading: () => (
    <DemoPage width="2xl">
      <DemoHeader eyebrow="Image segmentation" title="Segment Anything" />
    </DemoPage>
  ),
});

export default function SegmentAnythingClient() {
  return <SegmentAnythingExperience />;
}

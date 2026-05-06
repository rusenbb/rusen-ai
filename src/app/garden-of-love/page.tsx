"use client";

import { useState } from "react";
import Dedication from "./Dedication";
import Garden from "./Garden";

export default function GardenOfLovePage() {
  const [entered, setEntered] = useState(false);

  // position: fixed escapes the site's content-shell flex layout so the
  // garden truly covers the viewport — hiding the site Header, Footer, and
  // the DataBackground canvas that lives in the root layout.
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0a0a0f",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: entered ? 0 : 1,
          pointerEvents: entered ? "none" : "auto",
          transition: "opacity 400ms ease",
          zIndex: 2,
        }}
      >
        <Dedication onEnter={() => setEntered(true)} />
      </div>
      {entered && (
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <Garden />
        </div>
      )}
    </div>
  );
}

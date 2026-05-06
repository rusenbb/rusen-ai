"use client";

import { useState } from "react";
import Dedication from "./Dedication";
import Garden from "./Garden";

export default function GardenOfLovePage() {
  const [entered, setEntered] = useState(false);

  return (
    <div
      style={{
        position: "relative",
        background: "#0a0a0f",
        minHeight: "100vh",
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
      {entered && <Garden />}
    </div>
  );
}

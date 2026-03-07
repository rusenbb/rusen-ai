"use client";

import { useEffect } from "react";

export default function GameLifePageFlags() {
  useEffect(() => {
    document.body.dataset.gameLifePage = "on";
    return () => {
      delete document.body.dataset.gameLifePage;
    };
  }, []);

  return null;
}

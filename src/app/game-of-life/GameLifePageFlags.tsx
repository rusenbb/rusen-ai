"use client";

import { useEffect } from "react";

export default function GameLifePageFlags() {
  useEffect(() => {
    document.body.dataset.gameLifePage = "on";
    document.body.dataset.bgClear = "on";

    return () => {
      delete document.body.dataset.gameLifePage;
      delete document.body.dataset.bgClear;
    };
  }, []);

  return null;
}

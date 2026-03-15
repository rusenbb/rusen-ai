"use client";

import { useEffect } from "react";

export default function NotFoundPageFlags() {
  useEffect(() => {
    document.body.dataset.bgClear = "on";
    document.body.dataset.notFoundPage = "on";

    return () => {
      delete document.body.dataset.bgClear;
      delete document.body.dataset.notFoundPage;
    };
  }, []);

  return null;
}

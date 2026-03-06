"use client";

import { useEffect } from "react";

export function LastVisitBeacon() {
  useEffect(() => {
    void fetch("/api/viewer/last-visit", { method: "POST" });
  }, []);

  return null;
}

"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import { DASHBOARD_DUE_REFRESH_SESSION_KEY, DASHBOARD_REFRESH_START_EVENT } from "@/lib/dashboard-events";

const DUE_REFRESH_CHECK_INTERVAL_MS = 60 * 1000;
const INITIAL_DUE_REFRESH_DELAY_MS = 300;

export function DueSourceRefreshBeacon() {
  const router = useRouter();

  useEffect(() => {
    let isCancelled = false;
    let inFlight = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    let intervalId: ReturnType<typeof globalThis.setInterval> | null = null;

    function shouldSkipRefresh() {
      const lastCheckedAt = Number(window.sessionStorage.getItem(DASHBOARD_DUE_REFRESH_SESSION_KEY) ?? "0");
      const now = Date.now();

      if (Number.isFinite(lastCheckedAt) && now - lastCheckedAt < DUE_REFRESH_CHECK_INTERVAL_MS) {
        return true;
      }

      window.sessionStorage.setItem(DASHBOARD_DUE_REFRESH_SESSION_KEY, String(now));
      return false;
    }

    async function refreshDueSources() {
      if (isCancelled || inFlight || shouldSkipRefresh()) {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch("/api/sources/refresh-due", {
          method: "POST",
          cache: "no-store",
        });

        if (!response.ok || isCancelled) {
          return;
        }

        const payload = (await response.json()) as { completed?: number; createdCount?: number };
        if ((payload.createdCount ?? 0) > 0) {
          window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_START_EVENT));
          startTransition(() => {
            router.refresh();
          });
        }
      } catch {
        // Ignore best-effort refresh failures; the current feed can still render.
      } finally {
        inFlight = false;
      }
    }

    function handleWindowFocus() {
      void refreshDueSources();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshDueSources();
      }
    }

    timeoutId = globalThis.setTimeout(() => {
      void refreshDueSources();
    }, INITIAL_DUE_REFRESH_DELAY_MS);

    intervalId = globalThis.setInterval(() => {
      void refreshDueSources();
    }, DUE_REFRESH_CHECK_INTERVAL_MS);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }

      if (intervalId !== null) {
        globalThis.clearInterval(intervalId);
      }

      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}

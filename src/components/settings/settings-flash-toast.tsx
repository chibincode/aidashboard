"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { SETTINGS_TOAST_COOKIE, type SettingsToast } from "@/lib/settings-toast";

const TOAST_TIMEOUT_MS = 4000;

function clearSettingsToastCookie() {
  document.cookie = `${SETTINGS_TOAST_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function SettingsFlashToast({
  initialToast,
}: {
  initialToast: SettingsToast | null;
}) {
  const [toast, setToast] = useState<SettingsToast | null>(initialToast);

  useEffect(() => {
    if (!toast) {
      return;
    }

    clearSettingsToastCookie();

    const timeoutId = window.setTimeout(() => {
      setToast((currentToast) => (currentToast?.id === toast.id ? null : currentToast));
    }, TOAST_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[90] flex justify-end md:inset-x-6">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[20px] border border-emerald-200 bg-white px-4 py-3 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.45)]"
      >
        <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-medium text-slate-900">{toast.message}</p>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => setToast(null)}
          className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-black/[0.04] hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

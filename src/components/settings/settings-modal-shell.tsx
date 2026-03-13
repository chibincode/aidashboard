"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export function SettingsModalShell({
  open,
  title,
  description,
  onClose,
  children,
  widthClassName = "md:max-w-[720px]",
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto" aria-hidden={!open}>
      <div className="fixed inset-0 bg-[rgba(15,23,42,0.2)] backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex min-h-full w-full items-end justify-center p-0 md:items-start md:p-8">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`flex w-full flex-col overflow-hidden rounded-t-[30px] bg-[#f8f9fb] shadow-[0_36px_90px_-48px_rgba(15,23,42,0.55)] md:my-8 md:max-h-[calc(100vh-64px)] md:rounded-[30px] md:border md:border-black/8 ${widthClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-black/6 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" aria-label={`Close ${title}`} onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function SourceAvatar({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string | null;
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showFallback = !src || failedSrc === src;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold shadow-[0_16px_32px_-24px_rgba(15,23,42,0.8)]",
        showFallback ? fallbackClassName : "bg-white",
        className,
      )}
    >
      {!showFallback ? (
        <img
          src={src}
          alt={`${name} avatar`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

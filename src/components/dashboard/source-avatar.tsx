"use client";

import { useEffect, useState } from "react";
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
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold shadow-[0_16px_32px_-24px_rgba(15,23,42,0.8)]",
        !src || imageFailed ? fallbackClassName : "bg-white",
        className,
      )}
    >
      {src && !imageFailed ? (
        <img
          src={src}
          alt={`${name} avatar`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

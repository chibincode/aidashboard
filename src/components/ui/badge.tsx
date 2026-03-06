import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "muted" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        tone === "default" && "bg-slate-900 text-white",
        tone === "accent" && "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
        tone === "muted" && "bg-black/5 text-slate-600",
        tone === "danger" && "bg-[#fee2e2] text-[#991b1b]",
        className,
      )}
    >
      {children}
    </span>
  );
}

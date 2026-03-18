import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/75 bg-white/88 shadow-[0_18px_60px_-35px_rgba(12,23,32,0.35)] backdrop-blur",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

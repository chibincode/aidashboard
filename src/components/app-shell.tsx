import Link from "next/link";
import { appConfig } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/admin", label: "Control Room" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/tags", label: "Tags" },
];

export function AppShell({
  children,
  pathname,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  pathname: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,166,0.22),transparent_36%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_28%),linear-gradient(180deg,#eef6f2_0%,#f8f6ef_42%,#f4f1eb_100%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 py-4 md:px-8 md:py-6">
        <header className="mb-6 rounded-[32px] border border-white/70 bg-white/78 px-5 py-5 shadow-[0_18px_60px_-38px_rgba(12,23,32,0.35)] backdrop-blur md:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{appConfig.name}</Badge>
                <Badge tone={appConfig.isDemoMode ? "muted" : "default"}>
                  {appConfig.isDemoMode ? "Demo mode" : "Database-backed"}
                </Badge>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">{subtitle}</p>
            </div>
            <nav className="flex flex-wrap gap-2">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-slate-950 text-white"
                        : "bg-white/75 text-slate-700 ring-1 ring-black/8 hover:bg-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

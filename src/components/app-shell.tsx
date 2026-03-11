import Link from "next/link";

export function AppShell({
  children,
  title,
  subtitle,
  headerActions,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="mx-auto flex min-h-screen max-w-[1360px] flex-col px-4 pb-4 pt-4 md:px-6 md:pb-5 md:pt-5">
        <div className="sticky top-0 z-30 -mx-4 px-4 pb-[28px] md:-mx-6 md:px-6">
          <header className="relative border-b border-black/7 bg-[#f3f4f6]/88 px-1 py-3 backdrop-blur-md md:px-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link href="/" className="block truncate text-[15px] font-semibold tracking-tight text-slate-950">
                  {title}
                </Link>
                {subtitle ? <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p> : null}
              </div>
              {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
            </div>
          </header>
        </div>
        {children}
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { EXPLORE_MODES } from "@/constants/navigation";
import { cn } from "@/lib/utils";

export default function ExploreModeTabs({ className }: { className?: string } = {}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const worksPath = EXPLORE_MODES[1].href;
  const activeMode = pathname === worksPath || pathname.startsWith(`${worksPath}/`) ? "works" : "figures";

  return (
    <nav aria-label={t("explore")} className={cn("mx-auto mb-5 grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/20 p-1 md:mb-7 md:max-w-xs", className)}>
      {EXPLORE_MODES.map((mode) => (
        <Link
          key={mode.key}
          href={mode.href}
          prefetch={false}
          aria-current={mode.key === activeMode ? "page" : undefined}
          className={`flex min-h-11 items-center justify-center rounded-lg border px-5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            mode.key === activeMode ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20" : "border-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary"
          }`}
        >
          {t(`modes.${mode.key}`)}
        </Link>
      ))}
    </nav>
  );
}
